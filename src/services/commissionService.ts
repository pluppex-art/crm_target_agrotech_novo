import { getSupabaseClient } from '../lib/supabase';

// seller_commissions table no longer exists.
// Commission rates are now stored in commission_results / commission_rules.
// This service exposes a lightweight read of per-seller commission summaries
// derived from commission_results joined with perfis.

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
      .from('commission_results')
      .select('id, user_id, total_amount, created_at, updated_at, perfis!user_id(name)')
      .order('created_at', { ascending: false });

    if (error) { console.error('Error fetching commission results:', error); return []; }

    return (data || []).map((r: any) => ({
      id: r.id,
      seller_name: r.perfis?.name ?? r.user_id ?? 'Desconhecido',
      pluppex_rate: 0,
      target_rate: Number(r.total_amount) || 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  },

  // upsert and delete are no longer applicable with the new schema.
  // Retained as no-ops to avoid breaking any call-sites while the UI is updated.
  async upsert(_seller_name: string, _pluppex_rate: number, _target_rate: number): Promise<SellerCommission | null> {
    console.warn('commissionService.upsert: seller_commissions table no longer exists. Use commission_rules instead.');
    return null;
  },

  async delete(_id: string): Promise<boolean> {
    console.warn('commissionService.delete: seller_commissions table no longer exists.');
    return false;
  },
};
