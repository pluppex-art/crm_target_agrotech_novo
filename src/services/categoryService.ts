import { getSupabaseClient } from '../lib/supabase';
import { FinancialCategory, TransactionType } from '../types/finance_v2';

export const categoryService = {
  async getAll(): Promise<FinancialCategory[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('financial_categories')
      .select('*')
      .order('name');
      
    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    return data as FinancialCategory[];
  },

  async getByType(type: TransactionType): Promise<FinancialCategory[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('financial_categories')
      .select('*')
      .eq('type', type)
      .order('name');
      
    if (error) {
      console.error('Error fetching categories by type:', error);
      return [];
    }
    return data as FinancialCategory[];
  },

  async create(category: Omit<FinancialCategory, 'id' | 'is_system' | 'created_at'>): Promise<FinancialCategory | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('financial_categories')
      .insert([{ ...category, is_system: false }])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating category:', error);
      return null;
    }
    return data as FinancialCategory;
  },

  async update(id: string, updates: Partial<FinancialCategory>): Promise<FinancialCategory | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Prevent updating system categories
    const { data: existing } = await supabase.from('financial_categories').select('is_system').eq('id', id).single();
    if (existing?.is_system) {
      console.error('Cannot update a system category');
      return null;
    }

    const { data, error } = await supabase
      .from('financial_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return null;
    }
    return data as FinancialCategory;
  }
};
