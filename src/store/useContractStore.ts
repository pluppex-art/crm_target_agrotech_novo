import { create } from 'zustand';

// The `contracts` table no longer exists in the DB. This store is stubbed out to
// prevent runtime errors while UI components that reference it are updated.

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
  deleteContract: (id: string) => Promise<void>;
  subscribe: () => () => void;
}

export const useContractStore = create<ContractState>(() => ({
  contracts: [],
  loading: false,
  error: null,

  fetchContracts: async () => {
    // contracts table removed — no-op
  },

  addContract: async (_contract) => {
    console.warn('useContractStore.addContract: contracts table no longer exists.');
  },

  deleteContract: async (_id) => {
    console.warn('useContractStore.deleteContract: contracts table no longer exists.');
  },

  subscribe: () => {
    // No subscription needed for removed table
    return () => {};
  },
}));
