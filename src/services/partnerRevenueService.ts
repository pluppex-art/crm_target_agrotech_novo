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
  target_net_result: number;
  pluppex_percentage: number;
  target_percentage: number;
  net_margin: number;
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

    // 1. Fetch active rules with absolute fallbacks
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

    // 2. Fetch mapping data (squads/members)
    const [profilesRes, squadsRes, membersRes] = await Promise.all([
      supabase?.from('perfis').select('id, name, department') || { data: [] },
      supabase?.from('squads').select('id, name') || { data: [] },
      supabase?.from('squad_members').select('user_id, squad_id').eq('active', true) || { data: [] }
    ]);

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

    // 3. Fetch Financial Data (Unified & Filtered by Payment Date)
    const transactions = await transactionService.getCashFlowTransactions(startDate, endDate);
    
    // Log para debug
    console.log(`[PartnerService] Loaded ${transactions.length} transactions for period ${startDate} to ${endDate}`);

    // 4. Consolidate Data
    let total_revenue = 0;
    let target_sales = 0;
    let pluppex_sales = 0;
    let target_fee = 0;
    let pluppex_fee = 0;
    let pluppex_technology_fee = 0;

    const dailyData: Record<string, { pluppex: number, target: number }> = {};
    const formatDate = (d: string) => {
      const date = new Date(d);
      return `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    };

    // Initialize dailyData
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dailyData[formatDate(d.toISOString())] = { pluppex: 0, target: 0 };
    }

    // Process Unified Transactions (Manual + Legacy + Pipeline)
    transactions.forEach(tx => {
      // Use extremely robust logic (checking amount, value, and vendas)
      const amt = Number(tx.amount) || Number((tx as any).value) || Number((tx as any).vendas) || 0;
      const status = (tx.status || '').toUpperCase();
      const type = (tx.type || '').toUpperCase();

      const isPaid = ['PAID', 'PAGO', 'CONFIRMADO', 'COMPLETED', 'SUCCESS', 'RECEBIDO', 'ACTIVE', 'ENROLLED'].includes(status);
      const isIncome = ['INCOME', 'RECEITA', 'ENTRADA', 'CREDIT', 'VENDA'].includes(type);

      if (!isPaid || !isIncome) return;

      total_revenue += amt;
      
      // Determine origin based on responsible or user_id
      const leads = Array.isArray(tx.leads) ? tx.leads[0] : tx.leads;
      const respName = (leads?.responsible || (tx as any).responsible || (tx as any).perfis?.name || '').trim().toLowerCase();
      let origin = 'TARGET';
      
      if (respName && nameToCompanyMap[respName]) {
        origin = nameToCompanyMap[respName];
      } else if (tx.user_id && userCompanyMap[tx.user_id]) {
        origin = userCompanyMap[tx.user_id];
      }

      const dateKey = formatDate(tx.payment_date || tx.created_at);

      if (origin === 'PLUPPEX') {
        const fee = pluppexFixedFee + (amt * pluppexFeePercent);
        pluppex_sales += amt;
        pluppex_fee += fee;
        pluppex_technology_fee += fee;
        if (dailyData[dateKey]) dailyData[dateKey].pluppex += amt;
      } else {
        const fee = targetFixedFee + (amt * targetFeePercent);
        target_sales += amt;
        target_fee += fee;
        pluppex_technology_fee += fee;
        if (dailyData[dateKey]) dailyData[dateKey].target += amt;
      }
    });

    const chartData = Object.entries(dailyData)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => {
        const [da, ma] = a.date.split('/');
        const [db, mb] = b.date.split('/');
        return ma !== mb ? Number(ma) - Number(mb) : Number(da) - Number(db);
      });

    const target_net_result = total_revenue - pluppex_technology_fee;
    const net_margin = total_revenue > 0 ? (target_net_result / total_revenue) * 100 : 0;

    return {
      period_start: startDate,
      period_end: endDate,
      target_sales,
      pluppex_sales,
      total_revenue,
      pluppex_technology_fee,
      target_fee,
      pluppex_fee,
      target_net_result,
      pluppex_percentage: total_revenue > 0 ? (pluppex_sales / total_revenue) * 100 : 0,
      target_percentage: total_revenue > 0 ? (target_sales / total_revenue) * 100 : 0,
      net_margin,
      chartData,
      _debug: {
        txCount: transactions.length,
        leadCount: transactions.filter(t => t.origin_type === 'PIPELINE').length
      }
    };
  }
};
