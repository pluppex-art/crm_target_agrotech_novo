import { create } from 'zustand';
import { Transaction, financeService } from '../services/financeService';
import { getSupabaseClient } from '../lib/supabase';

interface FinanceStore {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  subscribe: () => () => void;
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,

  fetchTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await financeService.getTransactions();
      set({ transactions, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch transactions', isLoading: false });
    }
  },

  addTransaction: async (transaction) => {
    set({ isLoading: true, error: null });
    try {
      const newTransaction = await financeService.createTransaction(transaction);
      if (newTransaction) {
        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
          isLoading: false
        }));
      } else {
        set({ error: 'Failed to add transaction', isLoading: false });
      }
    } catch (err) {
      set({ error: 'Failed to add transaction', isLoading: false });
    }
  },

  deleteTransaction: async (id) => {
    const previousTransactions = get().transactions;
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));

    try {
      const success = await financeService.deleteTransaction(id);
      if (!success) {
        set({ transactions: previousTransactions, error: 'Failed to delete transaction' });
      }
    } catch (err) {
      set({ transactions: previousTransactions, error: 'Failed to delete transaction' });
    }
  },

  subscribe: () => {
    const supabase = getSupabaseClient();

    const channelId = `finance-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => {
          let updated = [...state.transactions];
          if (eventType === 'INSERT') {
            if (!updated.some(t => t.id === (newRecord as Transaction).id)) {
              updated = [newRecord as Transaction, ...updated];
            }
          } else if (eventType === 'UPDATE') {
            updated = updated.map(t => t.id === (newRecord as Transaction).id ? { ...t, ...newRecord } : t);
          } else if (eventType === 'DELETE') {
            updated = updated.filter(t => t.id !== (oldRecord as any).id);
          }
          return { transactions: updated };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
