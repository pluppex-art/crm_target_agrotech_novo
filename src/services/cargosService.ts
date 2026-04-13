import { getSupabaseClient, getServiceSupabaseClient } from '../lib/supabase';

export interface Cargo {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCargoPayload {
  name: string;
  description?: string;
  permissions?: string[];
}

export const cargosService = {
  async getCargos(): Promise<Cargo[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching cargos:', error);
      return [];
    }

    return data || [];
  },

  async createCargo(cargo: CreateCargoPayload): Promise<{ data: Cargo | null; error: any }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase client not initialized' };

    const { data, error } = await supabase
      .from('cargos')
      .insert([cargo])
      .select()
      .single();

    if (error) {
      console.error('Error creating cargo:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  async updateCargo(id: string, cargo: Partial<CreateCargoPayload>): Promise<{ data: Cargo | null; error: any }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase client not initialized' };

    const { data, error } = await supabase
      .from('cargos')
      .update(cargo)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating cargo:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  async deleteCargo(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('cargos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cargo:', error);
      return false;
    }

    return true;
  }
};

