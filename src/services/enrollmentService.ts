import { getSupabaseClient } from '../lib/supabase';
import {
  LeadClassEnrollment,
  EnrollmentWithDetails,
  EnrollParams,
  TransferParams,
  TransferResult,
  CancelParams,
  CancelResult,
} from '../types/enrollment';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

async function getRefundCategoryId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('financial_categories')
    .select('id')
    .eq('name', 'Reembolso a Cliente')
    .single();

  if (error || !data) {
    console.error('enrollmentService: categoria "Reembolso a Cliente" não encontrada', error);
    return null;
  }
  return data.id;
}

function toISODate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// Retorna o primeiro dia do mês de uma data ISO (para comparar com period_month)
function toPeriodMonth(isoDate: string): string {
  return isoDate.substring(0, 7) + '-01';
}

// ─────────────────────────────────────────────────────────────────────────────
// enrollmentService
// ─────────────────────────────────────────────────────────────────────────────

export const enrollmentService = {

  // ───────────────────────────────────────────────────────────────────────────
  // enroll
  // Matricula um lead em uma turma.
  // Não cria transação financeira — isso é responsabilidade do fluxo de pipeline.
  // income_transaction_id é opcional: vincula a transação já existente à matrícula.
  // ───────────────────────────────────────────────────────────────────────────
  async enroll(params: EnrollParams): Promise<LeadClassEnrollment | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('lead_class_enrollments')
      .insert([{
        lead_id:                params.lead_id,
        class_id:               params.class_id,
        responsavel_usuario_id: params.responsavel_usuario_id,
        status:                 'ENROLLED',
        contracted_amount:      params.contracted_amount ?? null,
        income_transaction_id:  params.income_transaction_id ?? null,
        notes:                  params.notes ?? null,
        created_by:             params.created_by ?? null,
      }])
      .select()
      .single();

    if (error) {
      console.error('enrollmentService.enroll:', error);
      return null;
    }
    return data as LeadClassEnrollment;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // transfer
  // Transfere um aluno de uma turma para outra.
  //
  // Fluxo:
  //   1. Valida que o enrollment existe e está ativo (ENROLLED ou CONFIRMED).
  //   2. Marca o enrollment atual como TRANSFERRED.
  //   3. Cria novo enrollment ENROLLED na nova turma.
  //   4. Se update_transaction_class = true e há income_transaction_id,
  //      atualiza class_id da transação para a nova turma.
  // ───────────────────────────────────────────────────────────────────────────
  async transfer(enrollmentId: string, params: TransferParams): Promise<TransferResult | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // 1. Busca enrollment atual
    const { data: current, error: fetchError } = await supabase
      .from('lead_class_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .single();

    if (fetchError || !current) {
      console.error('enrollmentService.transfer: enrollment não encontrado', fetchError);
      return null;
    }

    if (current.status !== 'ENROLLED' && current.status !== 'CONFIRMED') {
      console.error('enrollmentService.transfer: enrollment não está ativo', current.status);
      return null;
    }

    const now = new Date().toISOString();

    // 2. Marca atual como TRANSFERRED
    const { data: previous, error: updateError } = await supabase
      .from('lead_class_enrollments')
      .update({
        status:               'TRANSFERRED',
        transfer_to_class_id: params.to_class_id,
        transferred_at:       now,
        removed_at:           now,
        cancellation_reason:  params.reason ?? null,
      })
      .eq('id', enrollmentId)
      .select()
      .single();

    if (updateError || !previous) {
      console.error('enrollmentService.transfer: erro ao marcar TRANSFERRED', updateError);
      return null;
    }

    // 3. Cria novo enrollment na nova turma
    const { data: next, error: insertError } = await supabase
      .from('lead_class_enrollments')
      .insert([{
        lead_id:                current.lead_id,
        class_id:               params.to_class_id,
        responsavel_usuario_id: (current as any).responsavel_usuario_id ?? current.created_by ?? current.lead_id,
        status:                 'ENROLLED',
        contracted_amount:      current.contracted_amount,
        income_transaction_id:  current.income_transaction_id ?? null,
        notes:                  `Transferido de turma ${current.class_id}`,
        created_by:             current.created_by ?? null,
      }])
      .select()
      .single();

    if (insertError || !next) {
      console.error('enrollmentService.transfer: erro ao criar novo enrollment', insertError);
      return null;
    }

    // 4. Atualiza class_id na transação financeira, se solicitado
    if (params.update_transaction_class && current.income_transaction_id) {
      const { error: txError } = await supabase
        .from('financial_transactions')
        .update({ class_id: params.to_class_id })
        .eq('id', current.income_transaction_id);

      if (txError) {
        // Não reverte a transferência — loga para revisão manual
        console.warn(
          'enrollmentService.transfer: falha ao atualizar class_id na transação',
          txError
        );
      }
    }

    return {
      previous_enrollment: previous as LeadClassEnrollment,
      new_enrollment:      next     as LeadClassEnrollment,
    };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // cancel
  // Cancela a matrícula de um aluno, aplicando a lógica financeira correta:
  //
  //   Cenário 1 — Transação PENDING:
  //     → Cancela a transação (status = CANCELLED + cancellation_reason + cancelled_at)
  //     → Receita sai de contas a receber e não entra no DRE
  //
  //   Cenário 2 — Transação PAID + refund_type = NONE:
  //     → Apenas marca matrícula como CANCELLED
  //     → Receita permanece PAID no DRE
  //
  //   Cenário 3 — Transação PAID + refund_type = FULL ou PARTIAL:
  //     → Cria EXPENSE/REFUND/PAID vinculado à receita original
  //     → Verifica divergência de OTE (comissão já paga no período?)
  //
  //   Sem transação vinculada:
  //     → Apenas marca matrícula como CANCELLED
  // ───────────────────────────────────────────────────────────────────────────
  async cancel(enrollmentId: string, params: CancelParams): Promise<CancelResult | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // 1. Busca enrollment
    const { data: enrollment, error: fetchError } = await supabase
      .from('lead_class_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .single();

    if (fetchError || !enrollment) {
      console.error('enrollmentService.cancel: enrollment não encontrado', fetchError);
      return null;
    }

    if (enrollment.status === 'CANCELLED') {
      console.warn('enrollmentService.cancel: enrollment já cancelado');
      return null;
    }

    const now = new Date().toISOString();
    const today = toISODate();
    let refundTransactionId: string | null = null;
    let oteDivergence = false;
    let oteDivergencePeriod: string | null = null;

    // 2. Lógica financeira
    if (enrollment.income_transaction_id) {
      const { data: tx, error: txFetchError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', enrollment.income_transaction_id)
        .single();

      if (txFetchError || !tx) {
        console.warn('enrollmentService.cancel: transação vinculada não encontrada — cancelando apenas matrícula');
      } else if (tx.status === 'PENDING') {
        // Cenário 1: cancela transação pendente
        const { error: txCancelError } = await supabase
          .from('financial_transactions')
          .update({
            status:              'CANCELLED',
            cancellation_reason: params.reason,
            cancelled_at:        now,
          })
          .eq('id', tx.id);

        if (txCancelError) {
          console.error('enrollmentService.cancel: erro ao cancelar transação PENDING', txCancelError);
          return null;
        }

      } else if (tx.status === 'PAID' && params.refund_type !== 'NONE') {
        // Cenário 3: transação PAID com reembolso
        const refundCategoryId = await getRefundCategoryId();
        if (!refundCategoryId) return null;

        const refundAmount = params.refund_type === 'FULL'
          ? Number(tx.amount)
          : Number(params.refund_amount ?? 0);

        if (refundAmount <= 0) {
          console.error('enrollmentService.cancel: refund_amount inválido para reembolso', refundAmount);
          return null;
        }

        const { data: refundTx, error: refundError } = await supabase
          .from('financial_transactions')
          .insert([{
            description:           `Reembolso — ${tx.description}`,
            amount:                refundAmount,
            type:                  'EXPENSE',
            status:                'PAID',
            category_id:           refundCategoryId,
            lead_id:               tx.lead_id,
            class_id:              tx.class_id,
            user_id:               tx.user_id,
            source_transaction_id: tx.id,
            origin_type:           'REFUND',
            partner_origin:        tx.partner_origin ?? null,
            due_date:              today,
            payment_date:          today,
          }])
          .select('id')
          .single();

        if (refundError || !refundTx) {
          console.error('enrollmentService.cancel: erro ao criar transação de reembolso', refundError);
          return null;
        }

        refundTransactionId = refundTx.id;

        // Verifica divergência de OTE: comissão do vendedor neste período já foi paga?
        if (tx.user_id && tx.payment_date) {
          const period = toPeriodMonth(tx.payment_date);
          const { data: commissionResult } = await supabase
            .from('commission_results')
            .select('id, status, period_month')
            .eq('user_id', tx.user_id)
            .eq('period_month', period)
            .eq('status', 'PAID')
            .maybeSingle();

          if (commissionResult) {
            oteDivergence = true;
            oteDivergencePeriod = period;
            console.warn(
              `enrollmentService.cancel: reembolso criado mas comissão de ${tx.user_id} no período ${period} já está PAID — revisão manual necessária`
            );
          }
        }
      }
      // Cenário 2 (PAID + NONE): nenhuma ação financeira, só cancela matrícula abaixo
    }

    // 3. Cancela matrícula
    const refundStatusMap = { NONE: 'NONE', PARTIAL: 'PARTIAL', FULL: 'FULL' } as const;

    const { data: cancelled, error: cancelError } = await supabase
      .from('lead_class_enrollments')
      .update({
        status:              'CANCELLED',
        removed_at:          now,
        cancellation_reason: params.reason,
        refund_status:       refundStatusMap[params.refund_type],
      })
      .eq('id', enrollmentId)
      .select()
      .single();

    if (cancelError || !cancelled) {
      console.error('enrollmentService.cancel: erro ao cancelar matrícula', cancelError);
      return null;
    }

    return {
      enrollment:            cancelled as LeadClassEnrollment,
      refund_transaction_id: refundTransactionId,
      ote_divergence:        oteDivergence,
      ote_divergence_period: oteDivergencePeriod,
    };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // getHistory
  // Retorna todas as matrículas de um lead, com dados da turma e produto.
  // Inclui todos os status (histórico completo).
  // ───────────────────────────────────────────────────────────────────────────
  async getHistory(leadId: string): Promise<EnrollmentWithDetails[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('lead_class_enrollments')
      .select(`
        *,
        turmas!class_id (
          id,
          name,
          date,
          status,
          price,
          category
        )
      `)
      .eq('lead_id', leadId)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('enrollmentService.getHistory:', error);
      return [];
    }

    return (data ?? []) as unknown as EnrollmentWithDetails[];
  },

  // ───────────────────────────────────────────────────────────────────────────
  // getByClass
  // Retorna todas as matrículas ativas de uma turma.
  // ───────────────────────────────────────────────────────────────────────────
  async getByClass(classId: string, activeOnly = true): Promise<LeadClassEnrollment[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('lead_class_enrollments')
      .select('*')
      .eq('class_id', classId)
      .order('enrolled_at', { ascending: true });

    if (activeOnly) {
      query = query.in('status', ['ENROLLED', 'CONFIRMED']);
    }

    const { data, error } = await query;

    if (error) {
      console.error('enrollmentService.getByClass:', error);
      return [];
    }

    return (data ?? []) as LeadClassEnrollment[];
  },

  // ───────────────────────────────────────────────────────────────────────────
  // confirm
  // Marca uma matrícula como CONFIRMED (aluno confirmou presença / assinou contrato).
  // ───────────────────────────────────────────────────────────────────────────
  async confirm(enrollmentId: string): Promise<LeadClassEnrollment | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('lead_class_enrollments')
      .update({
        status:       'CONFIRMED',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .select()
      .single();

    if (error) {
      console.error('enrollmentService.confirm:', error);
      return null;
    }
    return data as LeadClassEnrollment;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // complete
  // Marca uma matrícula como COMPLETED ao final da turma.
  // ───────────────────────────────────────────────────────────────────────────
  async complete(enrollmentId: string): Promise<LeadClassEnrollment | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('lead_class_enrollments')
      .update({
        status:       'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .select()
      .single();

    if (error) {
      console.error('enrollmentService.complete:', error);
      return null;
    }
    return data as LeadClassEnrollment;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // markNoShow
  // Marca como NO_SHOW: aluno contratou mas não compareceu.
  // Não cancela financeiro (receita permanece PAID).
  // ───────────────────────────────────────────────────────────────────────────
  async markNoShow(enrollmentId: string, reason?: string): Promise<LeadClassEnrollment | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('lead_class_enrollments')
      .update({
        status:              'NO_SHOW',
        removed_at:          new Date().toISOString(),
        cancellation_reason: reason ?? null,
      })
      .eq('id', enrollmentId)
      .select()
      .single();

    if (error) {
      console.error('enrollmentService.markNoShow:', error);
      return null;
    }
    return data as LeadClassEnrollment;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // linkTransaction
  // Vincula retroativamente uma transação de receita a uma matrícula existente.
  // Útil para associar receitas migradas do legado.
  // ───────────────────────────────────────────────────────────────────────────
  async linkTransaction(enrollmentId: string, incomeTransactionId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('lead_class_enrollments')
      .update({ income_transaction_id: incomeTransactionId })
      .eq('id', enrollmentId);

    if (error) {
      console.error('enrollmentService.linkTransaction:', error);
      return false;
    }
    return true;
  },
};
