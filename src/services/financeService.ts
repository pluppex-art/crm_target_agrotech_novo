import { getSupabaseClient } from '../lib/supabase';
import { transactionService } from './transactionService';

export interface LegacyTransaction {
  status: string;
  id: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

export const financeService = {
  // Mantém compatibilidade temporária: lê da nova tabela mas devolve no formato antigo
  async getTransactions(): Promise<LegacyTransaction[]> {
    const newTx = await transactionService.getAll();

    // Fallback mapeando V2 para V1 para não quebrar a interface atual antes da Fase 3
    return newTx.map(t => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type === 'INCOME' ? 'income' : 'expense',
      status: t.status,
      date: t.payment_date || t.created_at,
      category: (t as any).financial_categories?.name || 'Sem Categoria'
    }));
  },

  async createTransaction(transaction: Omit<LegacyTransaction, 'id'>): Promise<LegacyTransaction | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // transactions table no longer exists — write to financial_transactions instead.
    // Map legacy fields to the new schema as best-effort.
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([{
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type === 'income' ? 'INCOME' : 'EXPENSE',
        status: (transaction.status?.toUpperCase() as any) || 'PENDING',
        origin_type: 'MANUAL',
        payment_date: transaction.date || null,
        due_date: transaction.date || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return null;
    }

    return {
      id: data.id,
      description: data.description,
      amount: Number(data.amount),
      type: data.type === 'INCOME' ? 'income' : 'expense',
      status: data.status,
      date: data.payment_date || data.created_at,
      category: 'Sem Categoria',
    };
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase.from('financial_transactions').delete().eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }

    return true;
  }
};
