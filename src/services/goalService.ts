import { getSupabaseClient } from '../lib/supabase';

export interface Goal {
  id: string;
  type: 'company' | 'seller';
  seller_name: string | null;
  revenue_goal: number;
  leads_goal: number;
  created_at?: string;
  updated_at?: string;
}

export const goalService = {
  async getGoals(): Promise<Goal[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from('goals').select('*').order('type').order('seller_name');
    if (error) { console.error('Error fetching goals:', error); return []; }
    return data || [];
  },

  async getCompanyGoal(): Promise<Goal | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from('goals').select('*').eq('type', 'company').maybeSingle();
    return data;
  },

  async upsertCompanyGoal(revenue_goal: number, leads_goal: number): Promise<Goal | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const existing = await goalService.getCompanyGoal();
    if (existing) {
      const { data, error } = await supabase
        .from('goals')
        .update({ revenue_goal, leads_goal, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) { console.error(error); return null; }
      return data;
    } else {
      const { data, error } = await supabase
        .from('goals')
        .insert([{ type: 'company', seller_name: null, revenue_goal, leads_goal }])
        .select()
        .single();
      if (error) { console.error(error); return null; }
      return data;
    }
  },

  async upsertSellerGoal(seller_name: string, revenue_goal: number, leads_goal: number): Promise<Goal | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: existing } = await supabase
      .from('goals')
      .select('*')
      .eq('type', 'seller')
      .eq('seller_name', seller_name)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('goals')
        .update({ revenue_goal, leads_goal, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) { console.error(error); return null; }
      return data;
    } else {
      const { data, error } = await supabase
        .from('goals')
        .insert([{ type: 'seller', seller_name, revenue_goal, leads_goal }])
        .select()
        .single();
      if (error) { console.error(error); return null; }
      return data;
    }
  },

  async deleteGoal(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    const { error } = await supabase.from('goals').delete().eq('id', id);
    return !error;
  },
};
