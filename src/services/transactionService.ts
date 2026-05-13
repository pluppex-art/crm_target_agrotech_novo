import { getSupabaseClient } from '../lib/supabase';
import { FinancialTransaction, FinanceKPIs } from '../types/finance_v2';

const TRANSACTION_SELECT = '*, financial_categories(name), leads(id, name, product, responsible, responsavel_usuario_id), perfis(name), turmas(name)';

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  paymentDateStart?: string;
  paymentDateEnd?: string;
  type?: 'INCOME' | 'EXPENSE';
  status?: 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  categoryId?: string;
  userId?: string | string[];
  classId?: string;
  leadId?: string;
  centroCustoId?: string;
}

export const transactionService = {
  async getAll(filters?: TransactionFilters): Promise<FinancialTransaction[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    // 1. Fetch from financial_transactions (V2)
    let query = supabase
      .from('financial_transactions')
      .select(TRANSACTION_SELECT)
      .order('created_at', { ascending: false });

    if (filters) {
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);
      if (filters.paymentDateStart) query = query.gte('payment_date', filters.paymentDateStart);
      if (filters.paymentDateEnd) query = query.lte('payment_date', filters.paymentDateEnd);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters.userId) {
        if (Array.isArray(filters.userId)) query = query.in('user_id', filters.userId);
        else query = query.eq('user_id', filters.userId);
      }
      if (filters.centroCustoId) query = query.eq('centro_custo_id', filters.centroCustoId);
    }
    const { data: v2Data } = await query.limit(1000);

    return (v2Data || []) as unknown as FinancialTransaction[];
  },

  async create(transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<FinancialTransaction | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Strip any joined/virtual fields before inserting
    const {
      financial_categories: _fc, leads: _l, perfis: _p, turmas: _t,
      origin_type, partner_origin,
      ...dbFields
    } = transaction as any;

    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({
        ...dbFields,
        origin_type: origin_type ?? 'MANUAL',
        partner_origin: partner_origin ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
    return data as FinancialTransaction;
  },

  async update(id: string, updates: Partial<FinancialTransaction>): Promise<FinancialTransaction | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('financial_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      return null;
    }
    return data as FinancialTransaction;
  },

  async markAsPaid(id: string): Promise<FinancialTransaction | null> {
    // Just an alias for update
    return this.update(id, { status: 'PAID', payment_date: new Date().toISOString().split('T')[0] });
  },

  async cancel(id: string): Promise<FinancialTransaction | null> {
    return this.update(id, { status: 'CANCELLED' });
  },

  async getKPIs(filters?: { startDate?: string; endDate?: string }): Promise<FinanceKPIs> {
    const supabase = getSupabaseClient();
    const empty: FinanceKPIs = {
      receita_total: 0, despesa_total: 0, lucro_liquido: 0,
      margem_liquida: 0, contas_receber: 0, contas_receber_matriculas: 0,
      contas_receber_manual: 0, contas_pagar: 0, alunos_ganhos: 0,
    };
    if (!supabase) return empty;

    const startDate = filters?.startDate;
    const endDate = filters?.endDate;

    // paid_at may be NULL; fall back to enrolled_at so records aren't silently excluded by date filters
    const inRange = (paidAt: string | null, enrolledAt: string): boolean => {
      const d = (paidAt || enrolledAt || '').split('T')[0];
      if (!d) return true;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    };

    // Single enrollment query covers realized revenue (unlinked) + outstanding balance.
    // income_transaction_id IS NULL avoids double-counting with financial_transactions.
    // Busca transações manuais (V2)
    // 1. Pagas no período (para receita/despesa realizada)
    // 2. Pendentes/Atrasadas com vencimento no período (para projeção)
    const [paidManual, pendingManual] = await Promise.all([
      this.getAll({ paymentDateStart: startDate, paymentDateEnd: endDate, status: 'PAID' }),
      supabase
        .from('financial_transactions')
        .select('*, financial_categories(name), leads(responsible), perfis(name), turmas(name)')
        .in('status', ['PENDING', 'OVERDUE'])
        .gte('due_date', startDate || '2000-01-01')
        .lte('due_date', endDate || '2099-12-31')
    ]);

    const allTransactions = [...paidManual, ...(pendingManual.data || [])];

    const { data: enrollments } = await supabase
        .from('lead_class_enrollments')
        .select('id, taxa_matricula_recebido, taxa_matricula_paid_at, valor_recebido, valor_recebido_paid_at, contracted_amount, enrolled_at, income_transaction_id, cost_center')
        .neq('status', 'CANCELLED');

    let receita_total = 0;
    let despesa_total = 0;
    let contas_receber_manual = 0;
    let contas_receber_matriculas = 0;
    let contas_pagar = 0;

    // PENDING/OVERDUE PIPELINE excluded — enrollment balance is the source of truth
    allTransactions.forEach((t: FinancialTransaction) => {
      const amt = Number(t.amount) || 0;
      if (t.status === 'PAID') {
        if (t.type === 'INCOME') receita_total += amt;
        else despesa_total += amt;
      } else if (t.status === 'PENDING' || t.status === 'OVERDUE') {
        if (t.type === 'INCOME' && t.origin_type !== 'PIPELINE') contas_receber_manual += amt;
        else if (t.type === 'EXPENSE') contas_pagar += amt;
      }
    });

    const alunosIds = new Set<string>();
    (enrollments || []).forEach((e: any) => {
      const isCurso = true;
      const isAplicacao = false;
      
      if (!isCurso || isAplicacao) return;

      const taxa = Number(e.taxa_matricula_recebido) || 0;
      const valor = Number(e.valor_recebido) || 0;
      const contracted = Number(e.contracted_amount) || 0;

      if (!e.income_transaction_id) {
        if (taxa > 0 && inRange(e.taxa_matricula_paid_at, e.enrolled_at)) {
          receita_total += taxa;
          alunosIds.add(e.id);
        }
        if (valor > 0 && inRange(e.valor_recebido_paid_at, e.enrolled_at)) {
          receita_total += valor;
          alunosIds.add(e.id);
        }
      }

      // A Receber de Matrículas: saldo pendente de alunos que se matricularam NO PERÍODO
      const balance = contracted - valor;
      if (contracted > 0 && balance > 0 && inRange(null, e.enrolled_at)) {
        contas_receber_matriculas += balance;
      }
    });

    const alunos_ganhos = alunosIds.size;
    const lucro_liquido = receita_total - despesa_total;
    const margem_liquida = receita_total > 0 ? (lucro_liquido / receita_total) * 100 : 0;

    const contas_receber = contas_receber_manual + contas_receber_matriculas;

    return {
      receita_total,
      despesa_total,
      lucro_liquido,
      margem_liquida,
      contas_receber,
      contas_receber_manual,
      contas_receber_matriculas,
      contas_pagar,
      alunos_ganhos,
    };
  },

  // Retorna transações para exibição no Fluxo de Caixa e cálculo de parceria:
  //   - Transações V2 pagas no período (por payment_date) + todas pendentes/vencidas
  //   - Matrículas do pipeline (lead_class_enrollments) filtradas pelo período
  async getCashFlowTransactions(
    startDate?: string,
    endDate?: string,
    centroCustoId?: string
  ): Promise<FinancialTransaction[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    // 1. V2 manual transactions
    // Pagas no período (por payment_date) + Pendentes/Vencidas no período (por due_date)
    let pendingQuery: any = supabase
      .from('financial_transactions')
      .select(TRANSACTION_SELECT)
      .eq('status', 'PENDING')
      .gte('due_date', startDate || '2000-01-01')
      .lte('due_date', endDate || '2099-12-31');

    let overdueQuery: any = supabase
      .from('financial_transactions')
      .select(TRANSACTION_SELECT)
      .eq('status', 'OVERDUE')
      .gte('due_date', startDate || '2000-01-01')
      .lte('due_date', endDate || '2099-12-31');

    if (centroCustoId) {
      pendingQuery = pendingQuery.eq('centro_custo_id', centroCustoId);
      overdueQuery = overdueQuery.eq('centro_custo_id', centroCustoId);
    }

    const [paidTxs, pendingTxs, overdueTxs] = await Promise.all([
      this.getAll({ paymentDateStart: startDate, paymentDateEnd: endDate, status: 'PAID', centroCustoId }),
      pendingQuery,
      overdueQuery,
    ]);

    // Deduplicate and filter by cost_center
    const manualById = new Map<string, FinancialTransaction>();
    const allManual = [
      ...paidTxs,
      ...(pendingTxs.data || []),
      ...(overdueTxs.data || [])
    ];

    for (const t of allManual) {
      if (!manualById.has(t.id)) manualById.set(t.id, t);
    }
    const manualTxs = Array.from(manualById.values());

    // 2. Pipeline enrollment transactions split by payment date
    // Taxa: filtrada por taxa_matricula_paid_at | Valor: filtrada por valor_recebido_paid_at
    let taxaEnrollQuery: any = supabase
      .from('lead_class_enrollments')
      .select('id, taxa_matricula_recebido, taxa_matricula_paid_at, enrolled_at, cost_center, centro_custo_id, leads(id, name, product, responsible, responsavel_usuario_id), turmas!class_id(id, name, date)')
      .neq('status', 'CANCELLED')
      .gt('taxa_matricula_recebido', 0);
    let valorEnrollQuery: any = supabase
      .from('lead_class_enrollments')
      .select('id, valor_recebido, valor_recebido_paid_at, enrolled_at, cost_center, centro_custo_id, leads(id, name, product, responsible, responsavel_usuario_id), turmas!class_id(id, name, date)')
      .neq('status', 'CANCELLED')
      .gt('valor_recebido', 0);

    if (centroCustoId) {
      taxaEnrollQuery = taxaEnrollQuery.eq('centro_custo_id' as any, centroCustoId);
      valorEnrollQuery = valorEnrollQuery.eq('centro_custo_id' as any, centroCustoId);
    }
    
    if (startDate) {
      taxaEnrollQuery = taxaEnrollQuery.gte('taxa_matricula_paid_at', startDate + 'T00:00:00');
      valorEnrollQuery = valorEnrollQuery.gte('valor_recebido_paid_at', startDate + 'T00:00:00');
    }
    if (endDate) {
      taxaEnrollQuery = taxaEnrollQuery.lte('taxa_matricula_paid_at', endDate + 'T23:59:59');
      valorEnrollQuery = valorEnrollQuery.lte('valor_recebido_paid_at', endDate + 'T23:59:59');
    }

    // Sem filtro de cursos: inclui todos os registros
    // taxas e valores ja sao filtrados por status !== CANCELLED e valor > 0 acima

    const [{ data: taxaEnrolls, error: taxaErr }, { data: valorEnrolls, error: valorErr }] = await Promise.all([taxaEnrollQuery, valorEnrollQuery]);
    if (taxaErr) console.error('[getCashFlowTransactions] taxa query error:', taxaErr);
    if (valorErr) console.error('[getCashFlowTransactions] valor query error:', valorErr);

    const mappedEnrollments = [
      ...(taxaEnrolls || []).map((e: any) => ({
        id: e.id + '_taxa',
        description: `Taxa Matrícula: ${e.leads?.name || 'Lead'} - ${e.leads?.product || 'Produto'}`,
        amount: Number(e.taxa_matricula_recebido) || 0,
        type: 'INCOME',
        status: 'PAID',
        category_id: 'sales',
        payment_date: e.taxa_matricula_paid_at || e.enrolled_at,
        due_date: e.taxa_matricula_paid_at || e.enrolled_at,
        created_at: e.enrolled_at,
        origin_type: 'PIPELINE',
        cost_center: e.cost_center || 'cursos',
        leads: e.leads,
        turmas: e.turmas,
        financial_categories: { name: 'Vendas' }
      } as any)),
      ...(valorEnrolls || []).map((e: any) => ({
        id: e.id + '_valor',
        description: `Venda: ${e.leads?.name || 'Lead'} - ${e.leads?.product || 'Produto'}`,
        amount: Number(e.valor_recebido) || 0,
        type: 'INCOME',
        status: 'PAID',
        category_id: 'sales',
        payment_date: e.valor_recebido_paid_at || e.enrolled_at,
        due_date: e.valor_recebido_paid_at || e.enrolled_at,
        created_at: e.enrolled_at,
        origin_type: 'PIPELINE',
        cost_center: e.cost_center || 'cursos',
        leads: e.leads,
        turmas: e.turmas,
        financial_categories: { name: 'Vendas' }
      } as any)),
    ];

    return [...manualTxs, ...mappedEnrollments].sort((a, b) =>
      new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime()
    );
  },

  // Returns ALL "Ganho" leads in period (for counting + KPI + taxa display).
  // Financial data now comes from lead_class_enrollments (migrated from leads in migration 005).
  async getGanhoLeads(startDate: string, endDate: string): Promise<{
    updated_at: string;
    id: string; name: string; created_at: string;
    value: string | number; product: string | null;
    status: string;
    responsible: string | null;
    discount?: string | number; discount_type?: 'percent' | 'money'; discount_applied?: boolean;
    valor_recebido?: number | null; taxa_matricula_recebido?: number | null;
    pix_completed?: boolean; professor_proof_url?: string | null;
  }[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const LEAD_SELECT = 'id, name, status, created_at, updated_at, value, product, responsible';

    // 1. Leads by "Ganho/Fechado/Aprovado" stage
    const [byStatus, enrollmentsInPeriod] = await Promise.all([
      supabase
        .from('leads')
        .select(LEAD_SELECT + ', pipeline_stages!inner(name)'),
      // 2. Leads with financial activity in lead_class_enrollments
      supabase
        .from('lead_class_enrollments')
        .select('lead_id, enrolled_at, updated_at, valor_recebido, taxa_matricula_recebido, pix_completed')
        .neq('status', 'CANCELLED')
    ]);

    // Filtragem em JS para evitar erro 400 de múltiplos .or() no PostgREST
    const filteredLeads = ((byStatus.data || []) as any[]).filter(l => {
      const stageName = l.pipeline_stages?.name || '';
      const isWon = /Ganho|Fechado|Aprovado/i.test(stageName);
      if (!isWon) return false;

      const updated = l.updated_at || '';
      const created = l.created_at || '';
      return (updated >= startDate || created >= startDate) && (updated <= endDate + 'T23:59:59');
    });

    const enrollLeadIds = Array.from(new Set((enrollmentsInPeriod.data || [])
      .filter((e: any) => {
        const isFin = Number(e.valor_recebido) > 0 || Number(e.taxa_matricula_recebido) > 0 || e.pix_completed === true;
        const inPeriod = (e.enrolled_at >= startDate + 'T00:00:00' || e.updated_at >= startDate + 'T00:00:00') && e.updated_at <= endDate + 'T23:59:59';
        return isFin && inPeriod;
      })
      .map((e: any) => e.lead_id).filter(Boolean)));

    let byEnrollmentLeads: any[] = [];
    if (enrollLeadIds.length > 0) {
      const { data } = await supabase.from('leads').select(LEAD_SELECT).in('id', enrollLeadIds);
      byEnrollmentLeads = data || [];
    }

    // Deduplicate leads
    const seen = new Set<string>();
    const allLeads: any[] = [];
    for (const l of [...filteredLeads, ...byEnrollmentLeads]) {
      if (!seen.has(l.id)) {
        seen.add(l.id);
        allLeads.push(l);
      }
    }

    if (allLeads.length === 0) return [];

    const leadIds = allLeads.map(l => l.id);

    // 3. Fetch financial data from lead_class_enrollments (sole source of truth after migration 009)
    const { data: enrollmentsData } = await supabase
      .from('lead_class_enrollments')
      .select('lead_id, valor_recebido, taxa_matricula_recebido, pix_completed, professor_proof_url, discount, discount_type, discount_applied')
      .in('lead_id', leadIds)
      .neq('status', 'CANCELLED');

    // Build per-lead financial map (sum all non-cancelled enrollments)
    const enrollMap: Record<string, any> = {};
    for (const e of (enrollmentsData || [])) {
      if (!enrollMap[e.lead_id]) {
        enrollMap[e.lead_id] = { valor_recebido: 0, taxa_matricula_recebido: 0, pix_completed: false, professor_proof_url: null, discount: null, discount_type: null, discount_applied: false };
      }
      enrollMap[e.lead_id].valor_recebido += Number(e.valor_recebido || 0);
      enrollMap[e.lead_id].taxa_matricula_recebido += Number(e.taxa_matricula_recebido || 0);
      if (e.pix_completed) enrollMap[e.lead_id].pix_completed = true;
      if (e.professor_proof_url) enrollMap[e.lead_id].professor_proof_url = e.professor_proof_url;
      if (e.discount) enrollMap[e.lead_id].discount = e.discount;
      if (e.discount_type) enrollMap[e.lead_id].discount_type = e.discount_type;
      if (e.discount_applied) enrollMap[e.lead_id].discount_applied = e.discount_applied;
    }

    return allLeads.map(l => {
      const { pipeline_stages: _ps, ...rest } = l;
      const fin = enrollMap[l.id];
      return {
        ...rest,
        valor_recebido: fin?.valor_recebido ?? 0,
        taxa_matricula_recebido: fin?.taxa_matricula_recebido ?? 0,
        pix_completed: fin?.pix_completed ?? false,
        professor_proof_url: fin?.professor_proof_url ?? null,
        discount: fin?.discount ?? null,
        discount_type: fin?.discount_type ?? null,
        discount_applied: fin?.discount_applied ?? false,
      };
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  // Get all active Centro de Custos
  async getCentroCustos(): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from('centro_custos').select('*').eq('ativo', true).order('nome');
    return data || [];
  },

  // Keep alias for backwards compat (used nowhere else, but safe)
  async getMatriculaTaxas(startDate: string, endDate: string) {
    return this.getGanhoLeads(startDate, endDate);
  },
};
