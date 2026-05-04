import { getSupabaseClient } from '../lib/supabase';
import { transactionService } from './transactionService';
import { TransactionType } from '../types/finance_v2';

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

  // Mantém a criação apontando para a tabela antiga por segurança até o UI ser refatorado,
  // ou podemos tentar já inserir na nova. O ideal na transição suave é inserir na nova.
  // Porém, a interface antiga não envia category_id, ela envia texto 'category'.
  // Por isso, redirecionamos para a tabela velha, e a migration final (006) fará a unificação.
  async createTransaction(transaction: Omit<LegacyTransaction, 'id'>): Promise<LegacyTransaction | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Ainda escreve na velha tabela de transações para não quebrar UI existente.
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) {
      console.error('Error creating legacy transaction:', error);
      return null;
    }

    return data as LegacyTransaction;
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // Tenta deletar das duas para garantir, já que não sabemos se o ID veio da nova ou velha
    const { error: err1 } = await supabase.from('transactions').delete().eq('id', id);
    const { error: err2 } = await supabase.from('financial_transactions').delete().eq('id', id);

    if (err1 && err2) {
      console.error('Error deleting transaction from both tables');
      return false;
    }

    return true;
  }
};
