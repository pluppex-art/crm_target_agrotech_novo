import { getSupabaseClient } from '../lib/supabase';
import { FinancialTransaction, FinanceKPIs } from '../types/finance_v2';

export interface TransactionFilters {
  startDate?: string;       // filtra por created_at (legado)
  endDate?: string;         // filtra por created_at (legado)
  paymentDateStart?: string; // filtra por payment_date (para OTE)
  paymentDateEnd?: string;   // filtra por payment_date (para OTE)
  type?: 'INCOME' | 'EXPENSE';
  status?: 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  categoryId?: string;
  userId?: string | string[];
  classId?: string;
  leadId?: string;
}

export const transactionService = {
  async getAll(filters?: TransactionFilters): Promise<FinancialTransaction[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('financial_transactions')
      .select('*, financial_categories(name), leads(responsible)')
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
        if (Array.isArray(filters.userId)) {
          query = query.in('user_id', filters.userId);
        } else {
          query = query.eq('user_id', filters.userId);
        }
      }
      if (filters.classId) query = query.eq('class_id', filters.classId);
      if (filters.leadId) query = query.eq('lead_id', filters.leadId);
    }

    // Add a safe limit to prevent catastrophic slowness
    query = query.limit(500);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching financial_transactions:', error);
      return [];
    }
    return data as any;
  },

  async create(transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<FinancialTransaction | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([transaction])
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
      margem_liquida: 0, contas_receber: 0, contas_pagar: 0, alunos_ganhos: 0,
    };
    if (!supabase) return empty;

    // Query 1: Transações PAGAS no período — filtradas por payment_date (caixa realizado)
    let paidQuery = supabase
      .from('financial_transactions')
      .select('amount, type')
      .eq('status', 'PAID');
    if (filters?.startDate) paidQuery = paidQuery.gte('payment_date', filters.startDate);
    if (filters?.endDate) paidQuery = paidQuery.lte('payment_date', filters.endDate);

    // Query 2: Transações PENDENTES e VENCIDAS — sem filtro de data (tudo em aberto)
    const pendingQuery = supabase
      .from('financial_transactions')
      .select('amount, type')
      .in('status', ['PENDING', 'OVERDUE']);

    // Query 3: Alunos ganhos no período — leads fechados (PIPELINE INCOME criados no período)
    let studentsQuery = supabase
      .from('financial_transactions')
      .select('lead_id')
      .eq('type', 'INCOME')
      .eq('origin_type', 'PIPELINE')
      .not('lead_id', 'is', null);
    if (filters?.startDate) studentsQuery = studentsQuery.gte('created_at', filters.startDate);
    if (filters?.endDate) studentsQuery = studentsQuery.lte('created_at', filters.endDate + 'T23:59:59');

    const [paidResult, pendingResult, studentsResult] = await Promise.all([
      paidQuery,
      pendingQuery,
      studentsQuery,
    ]);

    if (paidResult.error || pendingResult.error) {
      console.error('transactionService.getKPIs:', paidResult.error ?? pendingResult.error);
      return empty;
    }

    let receita_total = 0;
    let despesa_total = 0;
    (paidResult.data ?? []).forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'INCOME') receita_total += amt;
      if (t.type === 'EXPENSE') despesa_total += amt;
    });

    let contas_receber = 0;
    let contas_pagar = 0;
    (pendingResult.data ?? []).forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'INCOME') contas_receber += amt;
      if (t.type === 'EXPENSE') contas_pagar += amt;
    });

    const alunos_ganhos = (studentsResult.data ?? []).length;
    const lucro_liquido = receita_total - despesa_total;
    const margem_liquida = receita_total > 0 ? (lucro_liquido / receita_total) * 100 : 0;

    return {
      receita_total,
      despesa_total,
      lucro_liquido,
      margem_liquida,
      contas_receber,
      contas_pagar,
      alunos_ganhos,
    };
  },

  // Retorna transações para exibição no Fluxo de Caixa:
  //   - PAGAS no período (filtradas por payment_date)
  //   - PENDENTES/VENCIDAS (todas em aberto, sem filtro de data)
  // Inclui join com leads para exibir nome do aluno nas transações de pipeline.
  async getCashFlowTransactions(
    startDate?: string,
    endDate?: string
  ): Promise<FinancialTransaction[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const SELECT = `
      *,
      financial_categories(name),
      leads(id, name, value, product, responsible),
      turmas(id, name, date)
    `;


    // Optimized: Only fetch PAID in the period, and limit PENDING/OVERDUE to a reasonable amount
    let paidQuery = supabase
      .from('financial_transactions')
      .select(SELECT)
      .eq('status', 'PAID')
      .order('payment_date', { ascending: false });
    if (startDate) paidQuery = paidQuery.gte('payment_date', startDate);
    if (endDate) paidQuery = paidQuery.lte('payment_date', endDate);

    const pendingQuery = supabase
      .from('financial_transactions')
      .select(SELECT)
      .in('status', ['PENDING', 'OVERDUE'])
      .order('due_date', { ascending: true })
      .limit(300);

    const [paidResult, pendingResult] = await Promise.all([paidQuery, pendingQuery]);

    if (paidResult.error || pendingResult.error) {
      console.error('transactionService.getCashFlowTransactions:', paidResult.error ?? pendingResult.error);
      return [];
    }

    return [...(paidResult.data ?? []), ...(pendingResult.data ?? [])] as any;
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

    // 1. Leads by "Ganho/Fechado/Aprovado" stage in period
    const [byStatus, enrollmentsInPeriod] = await Promise.all([
      supabase
        .from('leads')
        .select(LEAD_SELECT + ', pipeline_stages!inner(name)')
        .or('pipeline_stages.name.ilike.%Ganho%,pipeline_stages.name.ilike.%Fechado%,pipeline_stages.name.ilike.%Aprovado%')
        .or(`updated_at.gte.${startDate},created_at.gte.${startDate}`)
        .lte('updated_at', endDate + 'T23:59:59'),
      // 2. Leads with financial activity in lead_class_enrollments in period
      supabase
        .from('lead_class_enrollments')
        .select('lead_id')
        .neq('status', 'CANCELLED')
        .or(`valor_recebido.gt.0,taxa_matricula_recebido.gt.0,pix_completed.eq.true`)
        .or(`enrolled_at.gte.${startDate + 'T00:00:00'},updated_at.gte.${startDate + 'T00:00:00'}`)
        .lte('updated_at', endDate + 'T23:59:59'),
    ]);

    const enrollLeadIds = [...new Set((enrollmentsInPeriod.data || []).map((e: any) => e.lead_id).filter(Boolean))];

    let byEnrollmentLeads: any[] = [];
    if (enrollLeadIds.length > 0) {
      const { data } = await supabase.from('leads').select(LEAD_SELECT).in('id', enrollLeadIds);
      byEnrollmentLeads = data || [];
    }

    // Deduplicate leads
    const seen = new Set<string>();
    const allLeads: any[] = [];
    for (const l of [...(byStatus.data || []), ...byEnrollmentLeads]) {
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

  // Keep alias for backwards compat (used nowhere else, but safe)
  async getMatriculaTaxas(startDate: string, endDate: string) {
    return this.getGanhoLeads(startDate, endDate);
  },
};
