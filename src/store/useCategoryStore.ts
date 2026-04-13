import { create } from 'zustand';
import { getSupabaseClient } from '../lib/supabase';

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  subscribe: () => () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    set({ loading: true });
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');

    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ categories: data as Category[], loading: false });
    }
  },

  addCategory: async (name) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    set({ loading: true, error: null });
    const { error } = await supabase
      .from('product_categories')
      .insert([{ name: name.trim() }]);

    if (error) {
      const message = error.code === '23505' 
        ? 'Esta categoria já existe.' 
        : error.message;
      set({ error: message, loading: false });
      alert('Erro ao criar categoria: ' + message);
    } else {
      set({ loading: false });
    }
  },

  deleteCategory: async (id) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir categoria: ' + error.message);
    }
  },

  subscribe: () => {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    const channelId = `categories-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_categories' }, () => {
        get().fetchCategories();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
