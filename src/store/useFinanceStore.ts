import { create } from 'zustand';
import { Transaction, financeService } from '../services/financeService';

interface FinanceStore {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'Venda Curso Agrícola Full', category: 'Vendas', amount: 12000, type: 'income', date: '2026-04-02' },
  { id: '2', description: 'Aluguel Escritório', category: 'Infraestrutura', amount: -2500, type: 'expense', date: '2026-04-01' },
  { id: '3', description: 'Marketing Digital Ads', category: 'Marketing', amount: -1500, type: 'expense', date: '2026-03-30' },
  { id: '4', description: 'Venda Consultoria Solo', category: 'Serviços', amount: 4500, type: 'income', date: '2026-03-28' },
];

export const useFinanceStore = create<FinanceStore>((set) => ({
  transactions: MOCK_TRANSACTIONS,
  isLoading: false,
  error: null,

  fetchTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await financeService.getTransactions();
      if (transactions.length > 0) {
        set({ transactions, isLoading: false });
      } else {
        set({ isLoading: false });
      }
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
  }
}));
