import { getSupabaseClient } from '../lib/supabase';
import { transactionService } from './transactionService';

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
  turma_commissions: {
    id: string;
    name: string;
    revenue: number;
    commission: number;
    enrollments: number;
  }[];
  chartData: {
    date: string;
    pluppex: number;
    target: number;
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

    // 2. Fetch mapping data
    const [profilesRes, squadsRes, membersRes, turmasRes] = await Promise.all([
      supabase?.from('perfis').select('id, name, department') || { data: [] },
      supabase?.from('squads').select('id, name') || { data: [] },
      supabase?.from('squad_members').select('user_id, squad_id').eq('active', true) || { data: [] },
      supabase?.from('turmas').select('id, name') || { data: [] }
    ]);

    const turmaMap: Record<string, string> = {};
    (turmasRes.data || []).forEach((t: any) => {
      turmaMap[t.id] = t.name;
    });

    const squadNameMap: Record<string, string> = {};
    (squadsRes.data || []).forEach((s: any) => {
      if (s.name) squadNameMap[s.id] = s.name.toUpperCase();
    });

    const userCompanyMap: Record<string, string> = {};
    const nameToCompanyMap: Record<string, string> = {};

    (membersRes.data || []).forEach((m: any) => {
      const squadName = (squadNameMap[m.squad_id] || '').toUpperCase();
      if (squadName) {
        userCompanyMap[m.user_id] = squadName.includes('PLUPPEX') ? 'PLUPPEX' : 'TARGET';
      }
    });

    (profilesRes.data || []).forEach((p: any) => {
      if (!userCompanyMap[p.id]) {
        const dept = (p.department || '').toUpperCase();
        userCompanyMap[p.id] = dept.includes('PLUPPEX') ? 'PLUPPEX' : 'TARGET';
      }
      if (p.name) {
        const normalizedName = p.name.trim().toLowerCase();
        nameToCompanyMap[normalizedName] = userCompanyMap[p.id];
      }
    });

    // 3. Fetch Financial Data
    const transactions = await transactionService.getCashFlowTransactions(startDate, endDate);
    
    // 4. Consolidate Data
    let total_revenue = 0;
    let target_sales = 0;
    let pluppex_sales = 0;
    let target_fee = 0;
    let pluppex_fee = 0;
    let fixed_fee_total = 0;
    let variable_fee_total = 0;
    let pluppex_technology_fee = 0;

    const turmaData: Record<string, { revenue: number, commission: number, enrollments: number }> = {};
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

      total_revenue += amt;
      
      const leads = Array.isArray(tx.leads) ? tx.leads[0] : tx.leads;
      const respName = (leads?.responsible || (tx as any).responsible || (tx as any).perfis?.name || '').trim().toLowerCase();
      let origin = 'TARGET';
      
      if (respName && nameToCompanyMap[respName]) {
        origin = nameToCompanyMap[respName];
      } else if (tx.user_id && userCompanyMap[tx.user_id]) {
        origin = userCompanyMap[tx.user_id];
      }

      const dateKey = formatDate(tx.payment_date || tx.created_at);
      let variable = 0;

      if (origin === 'PLUPPEX') {
        variable = amt * pluppexFeePercent;
        pluppex_sales += amt;
        pluppex_fee += variable; // Acumula variável aqui, somaremos o fixo no final
        if (dailyData[dateKey]) dailyData[dateKey].pluppex += amt;
      } else {
        variable = amt * targetFeePercent;
        target_sales += amt;
        target_fee += variable; // Acumula variável aqui, somaremos o fixo no final
        if (dailyData[dateKey]) dailyData[dateKey].target += amt;
      }

      variable_fee_total += variable;

      // Turma performance tracking - Enhanced detection
      const classId = tx.class_id || (tx as any).turma_id || (tx as any).turmas?.id;
      if (classId) {
        if (!turmaData[classId]) {
          turmaData[classId] = { revenue: 0, commission: 0, enrollments: 0 };
        }
        turmaData[classId].revenue += amt;
        turmaData[classId].commission += variable;
        turmaData[classId].enrollments += 1;
      }
    });

    const chartData = Object.entries(dailyData)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => {
        const [da, ma] = a.date.split('/');
        const [db, mb] = b.date.split('/');
        return ma !== mb ? Number(ma) - Number(mb) : Number(da) - Number(db);
      });

    const turma_commissions = Object.entries(turmaData).map(([id, stats]) => ({
      id,
      name: turmaMap[id] || `Turma #${id.substring(0, 4)}`,
      ...stats
    })).sort((a, b) => b.revenue - a.revenue);

    // 5. Finalize totals with fixed fees (calculated once per report period)
    fixed_fee_total = pluppexFixedFee + targetFixedFee;
    pluppex_technology_fee = variable_fee_total + fixed_fee_total;
    pluppex_fee += pluppexFixedFee;
    target_fee += targetFixedFee;

    const average_commission_per_turma = turma_commissions.length > 0 
      ? pluppex_technology_fee / turma_commissions.length 
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
      turma_commissions,
      chartData,
      _debug: {
        txCount: transactions.length,
        leadCount: transactions.filter(t => t.origin_type === 'PIPELINE').length
      }
    };
  }
};
