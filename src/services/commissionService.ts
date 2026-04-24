import { getSupabaseClient } from '../lib/supabase';

export interface SellerCommission {
  id: string;
  seller_name: string;
  pluppex_rate: number;
  target_rate: number;
  created_at?: string;
  updated_at?: string;
}

export const commissionService = {
  async getAll(): Promise<SellerCommission[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('seller_commissions')
      .select('*')
      .order('seller_name');
    if (error) { console.error('Error fetching commissions:', error); return []; }
    return (data || []).map(r => ({
      ...r,
      pluppex_rate: r.pluppex_rate ?? 0,
      target_rate: r.target_rate ?? 0,
    }));
  },

  async upsert(seller_name: string, pluppex_rate: number, target_rate: number): Promise<SellerCommission | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('seller_commissions')
      .upsert(
        { seller_name, pluppex_rate, target_rate, updated_at: new Date().toISOString() },
        { onConflict: 'seller_name' }
      )
      .select()
      .single();
    if (error) { console.error('Error upserting commission:', error); return null; }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    const { error } = await supabase.from('seller_commissions').delete().eq('id', id);
    return !error;
  },
};
