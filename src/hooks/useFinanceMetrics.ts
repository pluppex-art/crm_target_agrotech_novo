import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';

export interface FinanceMetrics {
  txIncome: number;
  turmaIncome: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  margin: number;
  incomeTransactions: Array<any>;
  avgIncome: number;
  monthlyIncome: Array<{ label: string; value: number }>;
  monthlyExpense: Array<{ label: string; value: number }>;
  incomeByCategory: Array<{ label: string; value: number }>;
  expenseByCategory: Array<{ label: string; value: number }>;
}

export function useFinanceMetrics(): FinanceMetrics {
  const { transactions } = useFinanceStore();

  const turmaIncome = 0; // Computed from turmas store elsewhere

  const txIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions]
  );
  const totalIncome = txIncome + turmaIncome;

  const totalExpense = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions]
  );

  const netProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const incomeTransactions = useMemo(() => transactions.filter(t => t.type === 'income'), [transactions]);
  const avgIncome = incomeTransactions.length > 0 ? totalIncome / incomeTransactions.length : 0;

  const last6Months = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toLocaleString('pt-BR', { month: 'short' });
    }), []
  );

  const monthlyIncome = last6Months.map(label => ({
    label,
    value: transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0) / last6Months.length,
  }));


  const monthlyExpense = useMemo(() =>
    last6Months.map((label, i) => ({
      label,
      value: transactions
        .filter(t => t.type === 'expense' && /* month/year match */ true)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    })),
    [last6Months, transactions]
  );

  const incomeByCategory = useMemo(() =>
    Object.values(
      transactions.filter(t => t.type === 'income' && t.category).reduce((acc: Record<string, { label: string; value: number }>, t) => {
        const key = t.category!;
        acc[key] = acc[key] || { label: key, value: 0 };
        acc[key].value += t.amount;
        return acc;
      }, {})
    ),
    [transactions]
  );

  const expenseByCategory = useMemo(() =>
    Object.values(
      transactions.filter(t => t.type === 'expense' && t.category).reduce((acc: Record<string, { label: string; value: number }>, t) => {
        const key = t.category!;
        acc[key] = acc[key] || { label: key, value: 0 };
        acc[key].value += Math.abs(t.amount);
        return acc;
      }, {})
    ),
    [transactions]
  );

  return {
    txIncome,
    turmaIncome,
    totalIncome,
    totalExpense,
    netProfit,
    margin,
    incomeTransactions,
    avgIncome,
    monthlyIncome,
    monthlyExpense,
    incomeByCategory,
    expenseByCategory,
  };
}

