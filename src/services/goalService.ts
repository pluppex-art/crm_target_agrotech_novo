import { getSupabaseClient } from '../lib/supabase';

export interface Goal {
  id: string;
  type: 'company' | 'seller';
  seller_name: string | null;
  seller_id: string | null; // stores seller name in current implementation
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

    const { data, error } = await supabase
      .from('goals')
      .upsert({ 
        type: 'company', 
        revenue_goal, 
        leads_goal, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'type' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting company goal:', error);
      // Fallback manual update/insert if unique index doesn't exist yet
      const existing = await goalService.getCompanyGoal();
      if (existing) {
        const { error: updErr } = await supabase
          .from('goals')
          .update({ revenue_goal, leads_goal, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (updErr) return null;
        return { ...existing, revenue_goal, leads_goal };
      } else {
        const { data: insData, error: insErr } = await supabase
          .from('goals')
          .insert([{ type: 'company', revenue_goal, leads_goal }])
          .select()
          .single();
        if (insErr) return null;
        return insData;
      }
    }
    return data;
  },

  async upsertSellerGoal(seller_id: string, seller_name: string, revenue_goal: number, leads_goal: number): Promise<Goal | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('goals')
      .upsert({
        type: 'seller',
        seller_id,
        seller_name,
        revenue_goal,
        leads_goal,
        updated_at: new Date().toISOString()
      }, { onConflict: 'type,seller_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting seller goal:', error);
      // Fallback manual check
      const { data: existing } = await supabase
        .from('goals')
        .select('*')
        .eq('type', 'seller')
        .eq('seller_id', seller_id)
        .maybeSingle();

      if (existing) {
        const { error: updErr } = await supabase
          .from('goals')
          .update({ seller_name, revenue_goal, leads_goal, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (updErr) return null;
        return { ...existing, seller_name, revenue_goal, leads_goal };
      } else {
        const { data: insData, error: insErr } = await supabase
          .from('goals')
          .insert([{ type: 'seller', seller_id, seller_name, revenue_goal, leads_goal }])
          .select()
          .single();
        if (insErr) return null;
        return insData;
      }
    }
    return data;
  },

  async deleteGoal(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    const { error } = await supabase.from('goals').delete().eq('id', id);
    return !error;
  },
};
