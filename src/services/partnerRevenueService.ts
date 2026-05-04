import { getSupabaseClient } from '../lib/supabase';
import { transactionService } from './transactionService';

export interface PartnerReport {
  period_start: string;
  period_end: string;
  target_sales: number;
  pluppex_sales: number;
  total_revenue: number;
  pluppex_technology_fee: number;
}

export const partnerRevenueService = {
  async getPartnerReport(startDate: string, endDate: string): Promise<PartnerReport> {
    const supabase = getSupabaseClient();
    
    // Fetch active rules
    const { data: rules } = await supabase
      ?.from('partner_rules')
      .select('*')
      .eq('active', true) || { data: [] };

    // Get fee percent from active rules — NO hardcoded fallback
    if (!rules || rules.length === 0) {
      console.warn('[partnerRevenueService] Nenhuma regra de parceria ativa encontrada. Verifique as Configurações Financeiras.');
    }
    const pluppexRule = rules?.find(r => r.origin_type === 'PLUPPEX' && r.active);
    const targetRule = rules?.find(r => r.origin_type === 'TARGET' && r.active);

    const pluppexFeePercent = pluppexRule ? Number(pluppexRule.technology_fee_percent) / 100 : 0;
    const targetFeePercent = targetRule ? Number(targetRule.technology_fee_percent) / 100 : 0;

    const transactions = await transactionService.getAll({
      paymentDateStart: startDate,
      paymentDateEnd: endDate,
      type: 'INCOME',
      status: 'PAID'
    });

    let target_sales = 0;
    let pluppex_sales = 0;
    let total_revenue = 0;
    let pluppex_technology_fee = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      total_revenue += amt;
      
      if (t.partner_origin === 'TARGET') {
        target_sales += amt;
        pluppex_technology_fee += amt * targetFeePercent;
      } else if (t.partner_origin === 'PLUPPEX') {
        pluppex_sales += amt;
        pluppex_technology_fee += amt * pluppexFeePercent;
      } else {
        // Fallback: If not explicitly tagged, consider it Target's standard sale
        target_sales += amt;
        pluppex_technology_fee += amt * targetFeePercent;
      }
    });

    return {
      period_start: startDate,
      period_end: endDate,
      target_sales,
      pluppex_sales,
      total_revenue,
      pluppex_technology_fee
    };
  }
};
