import { getSupabaseClient } from '../lib/supabase';

export interface PartnerReport {
  period_start: string;
  period_end: string;
  target_sales: number;
  pluppex_sales: number;
  total_revenue: number;
  pluppex_technology_fee: number;
  target_fee: number;
  pluppex_fee: number;
  fixed_fee_total: number;
  variable_fee_total: number;
  target_net_result: number;
  pluppex_percentage: number;
  target_percentage: number;
  net_margin: number;
  average_commission_per_turma: number;
  chartData: {
    date: string;
    pluppex: number;
    target: number;
  }[];
  total_bpo: number;
  total_bpo_pluppex: number;
  total_matriculas: number;
  turmas: {
    class_id: string;
    class_name: string;
    total_matriculas: number;
    receita_total: number;
    bpo_target: number;
    bpo_pluppex: number;
    total_bpo: number;
  }[];
  _debug?: {
    txCount: number;
    leadCount: number;
  };
}

export const partnerRevenueService = {
  async getPartnerReport(startDate: string, endDate: string): Promise<PartnerReport> {
    const supabase = getSupabaseClient();

    // 1. Fetch active rules
    const { data: rules } = await supabase
      ?.from('partner_rules')
      .select('*')
      .eq('active', true) || { data: [] };

    const pluppexRule = rules?.find(r => r.origin_type?.toUpperCase() === 'PLUPPEX');
    const targetRule = rules?.find(r => r.origin_type?.toUpperCase() === 'TARGET');

    const pluppexFeePercent = (pluppexRule?.technology_fee_percent || 18) / 100;
    const targetFeePercent = (targetRule?.technology_fee_percent || 8) / 100;
    const pluppexFixedFee = Number(pluppexRule?.fixed_fee || 0);
    const targetFixedFee = Number(targetRule?.fixed_fee || 0);

    // 2. Fetch turma map only (origin now comes from seller_origin column)
    const turmasRes = await (supabase?.from('turmas').select('id, name, date') || { data: [] });

    const turmaMap: Record<string, { name: string, date: string }> = {};
    (turmasRes.data || []).forEach((t: any) => {
      turmaMap[t.id] = { name: t.name, date: t.date };
    });

    // 3. Fetch Financial Data (Baseado nas turmas do período)
    // Buscamos todas as matrículas de turmas que acontecem no mês selecionado, 
    // independente de quando o pagamento foi feito (Maio de Maio).
    const { data: enrollments } = await (supabase
      .from('lead_class_enrollments') as any)
      .select('*, seller_origin, leads(id, name, responsible), turmas!class_id(id, name, date)')
      .neq('status', 'CANCELLED')
      .gte('turmas.date', startDate + 'T00:00:00')
      .lte('turmas.date', endDate + 'T23:59:59');

    // Mapeia os enrollments para o formato de transação esperado pela lógica abaixo
    const transactions: any[] = [];
    (enrollments || []).forEach((e: any) => {
      if (!e.turmas) return;

      const receivedTaxa = Number(e.taxa_matricula_recebido) || 0;
      const receivedValor = Number(e.valor_recebido) || 0;

      if (receivedTaxa > 0 || receivedValor > 0) {
        transactions.push({
          id: e.id,
          amount: receivedTaxa + receivedValor,
          status: 'PAID',
          type: 'INCOME',
          cost_center: e.cost_center,
          class_id: e.class_id,
          turmas: e.turmas,
          leads: e.leads,
          seller_origin: e.seller_origin,
          payment_date: e.taxa_matricula_paid_at || e.valor_recebido_paid_at || e.enrolled_at,
          origin_type: 'PIPELINE'
        });
      }
    });

    // Também busca transações manuais vinculadas a essas turmas
    const { data: manualTxs } = await (supabase
      .from('financial_transactions')
      .select('*, leads(id, name, responsible), turmas!inner(id, name, date)') as any)
      .eq('status', 'PAID')
      .gte('turmas.date', startDate + 'T00:00:00')
      .lte('turmas.date', endDate + 'T23:59:59');
    
    if (manualTxs) {
      manualTxs.forEach((tx: any) => {
        // Evita duplicidade se a transação já foi processada via enrollment (income_transaction_id)
        const isAlreadyAdded = transactions.some(t => t.id === tx.id);
        if (!isAlreadyAdded) {
           transactions.push(tx);
        }
      });
    }
    
    // 4. Consolidate Data
    let total_revenue = 0;
    let target_sales = 0;
    let pluppex_sales = 0;
    let target_fee = 0;
    let pluppex_fee = 0;
    let fixed_fee_total = 0;
    let variable_fee_total = 0;
    let pluppex_technology_fee = 0;
    let variable_pluppex_only = 0;
    let variable_target_only = 0;
    let total_matriculas = 0;

    const turmaData: Record<string, { 
      receita_total: number, 
      bpo_target: number, 
      bpo_pluppex: number, 
      uniqueEnrollmentIds: Set<string>
    }> = {};
    const dailyData: Record<string, { pluppex: number, target: number }> = {};
    const formatDate = (d: string) => {
      const date = new Date(d);
      return `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    };

    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dailyData[formatDate(d.toISOString())] = { pluppex: 0, target: 0 };
    }

    transactions.forEach(tx => {
      const amt = Number(tx.amount) || Number((tx as any).value) || Number((tx as any).vendas) || 0;
      const status = (tx.status || '').toUpperCase();
      const type = (tx.type || '').toUpperCase();

      const isPaid = ['PAID', 'PAGO', 'CONFIRMADO', 'COMPLETED', 'SUCCESS', 'RECEBIDO', 'ACTIVE', 'ENROLLED'].includes(status);
      const isIncome = ['INCOME', 'RECEITA', 'ENTRADA', 'CREDIT', 'VENDA'].includes(type);

      if (!isPaid || !isIncome) return;

      // Sem filtro de cursos: inclui todos os registros (drone, administrativo, etc)
      const costCenter = (tx as any).cost_center;

      total_revenue += amt;
      


      // seller_origin é a fonte de verdade (migration 008); fallback para TARGET
      const sellerOrigin = ((tx as any).seller_origin || '').toUpperCase();
      const origin = sellerOrigin === 'PLUPPEX' ? 'PLUPPEX' : 'TARGET';

      const dateKey = formatDate(tx.payment_date || tx.created_at);
      let variable = 0;

      if (origin === 'PLUPPEX') {
        variable = amt * pluppexFeePercent;
        pluppex_sales += amt;
        pluppex_fee += variable;
        variable_pluppex_only += variable;
        if (dailyData[dateKey]) dailyData[dateKey].pluppex += amt;
      } else {
        variable = amt * targetFeePercent;
        target_sales += amt;
        target_fee += variable;
        variable_target_only += variable;
        if (dailyData[dateKey]) dailyData[dateKey].target += amt;
      }

      variable_fee_total += variable;

      // Turma performance tracking
      const classId = tx.class_id || (tx as any).turma_id || (tx as any).turmas?.id;
      if (classId) {
        if (!turmaData[classId]) {
          turmaData[classId] = { receita_total: 0, bpo_target: 0, bpo_pluppex: 0, uniqueEnrollmentIds: new Set() };
        }
        turmaData[classId].receita_total += amt;
        
        // Extrai o ID original da matrícula (remove o sufixo _taxa ou _valor)
        const originalEnrollmentId = tx.id.replace('_taxa', '').replace('_valor', '');
        if (tx.origin_type === 'PIPELINE') {
          turmaData[classId].uniqueEnrollmentIds.add(originalEnrollmentId);
        }
        if (origin === 'PLUPPEX') {
          turmaData[classId].bpo_pluppex += variable;
        } else {
          turmaData[classId].bpo_target += variable;
        }
      }
    });

    // Calcula o total de matrículas únicas no período
    const allUniqueEnrollments = new Set<string>();
    Object.values(turmaData).forEach(t => {
      t.uniqueEnrollmentIds.forEach(id => allUniqueEnrollments.add(id));
    });
    total_matriculas = allUniqueEnrollments.size;

    const chartData = Object.entries(dailyData)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => {
        const [da, ma] = a.date.split('/');
        const [db, mb] = b.date.split('/');
        return ma !== mb ? Number(ma) - Number(mb) : Number(da) - Number(db);
      });

    const turmas = Object.entries(turmaData)
      .map(([id, stats]) => {
        const turmaInfo = turmaMap[id];
        return {
          class_id: id,
          class_name: turmaInfo?.name || `Turma #${id.substring(0, 4)}`,
          class_date: turmaInfo?.date || '',
          receita_total: stats.receita_total,
          bpo_target: stats.bpo_target,
          bpo_pluppex: stats.bpo_pluppex,
          total_matriculas: stats.uniqueEnrollmentIds.size,
          total_bpo: stats.bpo_target + stats.bpo_pluppex
        };
      })
      .sort((a, b) => b.receita_total - a.receita_total);

    // 5. Finalize totals with fixed fees
    fixed_fee_total = pluppexFixedFee + targetFixedFee;
    pluppex_technology_fee = variable_fee_total + fixed_fee_total;
    pluppex_fee += pluppexFixedFee;
    target_fee += targetFixedFee;

    const average_commission_per_turma = turmas.length > 0 
      ? pluppex_technology_fee / turmas.length 
      : 0;

    return {
      period_start: startDate,
      period_end: endDate,
      target_sales,
      pluppex_sales,
      total_revenue,
      pluppex_technology_fee,
      target_fee,
      pluppex_fee,
      fixed_fee_total,
      variable_fee_total,
      target_net_result: total_revenue - pluppex_technology_fee,
      pluppex_percentage: total_revenue > 0 ? (pluppex_sales / total_revenue) * 100 : 0,
      target_percentage: total_revenue > 0 ? (target_sales / total_revenue) * 100 : 0,
      net_margin: total_revenue > 0 ? ((total_revenue - pluppex_technology_fee) / total_revenue) * 100 : 0,
      average_commission_per_turma,
      turmas,
      chartData,
      total_bpo: variable_fee_total,
      total_bpo_pluppex: variable_pluppex_only,
      total_matriculas,
      _debug: {
        txCount: transactions.length,
        leadCount: transactions.filter(t => t.origin_type === 'PIPELINE').length
      }
    };
  }
};
