import { getSupabaseClient } from '../lib/supabase';
import { PartnerRule, FinancialFeeRule } from '../types/finance_v2';

export const financialRulesService = {
  // --- Partner Rules ---
  async getPartnerRules(): Promise<PartnerRule[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('partner_rules')
      .select('*')
      .order('origin_type');

    if (error) {
      console.error('Error fetching partner rules:', error);
      return [];
    }
    return (data || []) as unknown as PartnerRule[];
  },

  async updatePartnerRule(id: string, updates: Partial<PartnerRule>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('partner_rules')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      console.error('Error updating partner rule:', error);
      return false;
    }
    return true;
  },

  async createPartnerRule(rule: Omit<PartnerRule, 'id' | 'created_at'>): Promise<PartnerRule | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('partner_rules')
      .insert([rule as any])
      .select()
      .single();

    if (error) {
      console.error('Error creating partner rule:', error);
      return null;
    }
    return data as unknown as PartnerRule;
  },

  // --- Fee Rules (financial_fee_rules table no longer exists; stubs retained for compatibility) ---
  async getFeeRules(): Promise<FinancialFeeRule[]> {
    console.warn('financialRulesService.getFeeRules: financial_fee_rules table no longer exists.');
    return [];
  },

  async updateFeeRule(_id: string, _updates: Partial<FinancialFeeRule>): Promise<boolean> {
    console.warn('financialRulesService.updateFeeRule: financial_fee_rules table no longer exists.');
    return false;
  },

  async createFeeRule(_rule: Omit<FinancialFeeRule, 'id' | 'created_at'>): Promise<FinancialFeeRule | null> {
    console.warn('financialRulesService.createFeeRule: financial_fee_rules table no longer exists.');
    return null;
  },

  async deletePartnerRule(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    const { error } = await supabase.from('partner_rules').delete().eq('id', id);
    return !error;
  },

  async deleteFeeRule(_id: string): Promise<boolean> {
    console.warn('financialRulesService.deleteFeeRule: financial_fee_rules table no longer exists.');
    return false;
  }
};
