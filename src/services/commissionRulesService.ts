import { getSupabaseClient } from '../lib/supabase';
import { CommissionRule, RoleType } from '../types/finance_v2';

export const commissionRulesService = {
  async getAll(): Promise<CommissionRule[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('commission_rules')
      .select('*')
      .order('role_type')
      .order('level');

    if (error) {
      console.error('[commissionRulesService] Error fetching rules:', error);
      return [];
    }
    return (data || []) as CommissionRule[];
  },

  async create(rule: Omit<CommissionRule, 'id'>): Promise<CommissionRule | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('commission_rules')
      .insert([rule])
      .select()
      .single();

    if (error) {
      console.error('[commissionRulesService] Error creating rule:', error);
      return null;
    }
    return data as CommissionRule;
  },

  async update(id: string, fields: Partial<Omit<CommissionRule, 'id'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('commission_rules')
      .update(fields)
      .eq('id', id);

    if (error) {
      console.error('[commissionRulesService] Error updating rule:', error);
      return false;
    }
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('commission_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[commissionRulesService] Error deleting rule:', error);
      return false;
    }
    return true;
  },

  async setActive(id: string, active: boolean): Promise<boolean> {
    return this.update(id, { active });
  },
};
