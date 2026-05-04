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
    return data as PartnerRule[];
  },

  async updatePartnerRule(id: string, updates: Partial<PartnerRule>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('partner_rules')
      .update(updates)
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
      .insert([rule])
      .select()
      .single();

    if (error) {
      console.error('Error creating partner rule:', error);
      return null;
    }
    return data as PartnerRule;
  },

  // --- Fee Rules ---
  async getFeeRules(): Promise<FinancialFeeRule[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('financial_fee_rules')
      .select('*')
      .order('name');
      
    if (error) {
      console.error('Error fetching fee rules:', error);
      return [];
    }
    return data as FinancialFeeRule[];
  },

  async updateFeeRule(id: string, updates: Partial<FinancialFeeRule>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('financial_fee_rules')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating fee rule:', error);
      return false;
    }
    return true;
  },

  async createFeeRule(rule: Omit<FinancialFeeRule, 'id' | 'created_at'>): Promise<FinancialFeeRule | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('financial_fee_rules')
      .insert([rule])
      .select()
      .single();

    if (error) {
      console.error('Error creating fee rule:', error);
      return null;
    }
    return data as FinancialFeeRule;
  }
};
