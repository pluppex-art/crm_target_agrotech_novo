import { create } from 'zustand';
import { getSupabaseClient } from '../lib/supabase';

export interface Contract {
  id: string;
  created_at: string;
  title: string;
  content: string;
  status: 'draft' | 'sent' | 'signed' | 'cancelled';
  lead_id?: string;
  value: number;
}

interface ContractState {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  fetchContracts: () => Promise<void>;
  addContract: (contract: Omit<Contract, 'id' | 'created_at'>) => Promise<void>;
}

export const useContractStore = create<ContractState>((set) => ({
  contracts: [],
  loading: false,
  error: null,

  fetchContracts: async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ contracts: data as Contract[], loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch contracts', loading: false });
    }
  },

  addContract: async (contract) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('contracts')
        .insert([contract])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ contracts: [...state.contracts, data as Contract], loading: false }));
    } catch (error) {
      set({ error: 'Failed to create contract', loading: false });
    }
  },
}));
