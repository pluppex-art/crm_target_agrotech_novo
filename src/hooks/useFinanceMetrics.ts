import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useLeadStore } from '../store/useLeadStore';
import { useTurmaStore } from '../store/useTurmaStore';

export interface SellerCommissionRates {
  pluppex: number;
  target: number;
}

export interface SellerRevenueItem {
  seller: string;
  revenue: number;
  pluppex_rate: number;
  target_rate: number;
  pluppex_commission: number;
  target_commission: number;
  total_commission: number;
}

export interface DREData {
  receitaCursos: number;
  receitaTaxaMatricula: number;
  receitaTransacoes: number;
  receitaTotal: number;
  despesaTotal: number;
  resultadoBruto: number;
  margemBruta: number;
  pluppexCommissionsTotal: number;
  targetCommissionsTotal: number;
  totalCommissions: number;
  resultadoLiquido: number;
  margemLiquida: number;
}

export interface FinanceMetrics {
  txIncome: number;
  turmaIncome: number;
  taxaMatriculaTotal: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  margin: number;
  incomeTransactions: Array<any>;
  avgIncome: number;
  monthlyIncome: Array<{ label: string; value: number; month: number; year: number }>;
  monthlyExpense: Array<{ label: string; value: number }>;
  incomeByCategory: Array<{ label: string; value: number }>;
  expenseByCategory: Array<{ label: string; value: number }>;
  incomeBySource: Array<{ label: string; value: number }>;
  sellerRevenue: Array<SellerRevenueItem>;
  dre: DREData;
  commissionRates: Record<string, SellerCommissionRates>;
}

export function useFinanceMetrics(
  commissionRates: Record<string, SellerCommissionRates> = {}
): FinanceMetrics {
  const { transactions } = useFinanceStore();
  const { leads } = useLeadStore();
  const { turmas } = useTurmaStore();

  // --- Transaction-based income ---
  const txIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions]
  );

  const totalExpense = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions]
  );

  // --- Turma/Lead-based income ---
  const { turmaIncome, taxaMatriculaTotal } = useMemo(() => {
    let curso = 0;
    let taxa = 0;
    leads.forEach((l: any) => {
      curso += l.valor_recebido ?? 0;
      taxa += l.taxa_matricula_recebido ?? 0;
    });
    return { turmaIncome: curso, taxaMatriculaTotal: taxa };
  }, [leads]);

  const totalIncome = txIncome + turmaIncome + taxaMatriculaTotal;
  const netProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const incomeTransactions = useMemo(() => transactions.filter(t => t.type === 'income'), [transactions]);
  const avgIncome = incomeTransactions.length > 0 ? txIncome / incomeTransactions.length : 0;

  // --- Monthly income (last 12 months, real month matching) ---
  const last12Months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (11 - i));
      return { label: d.toLocaleString('pt-BR', { month: 'short' }), month: d.getMonth(), year: d.getFullYear() };
    });
  }, []);

  const monthlyIncome = useMemo(() => {
    return last12Months.map(({ label, month, year }) => {
      const txVal = transactions
        .filter(t => {
          if (t.type !== 'income') return false;
          const d = new Date(t.date);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((s, t) => s + Math.abs(t.amount), 0);

      const leadVal = leads.reduce((s: number, l: any) => {
        if (!l.created_at) return s;
        const d = new Date(l.created_at);
        if (d.getMonth() !== month || d.getFullYear() !== year) return s;
        return s + (l.valor_recebido ?? 0) + (l.taxa_matricula_recebido ?? 0);
      }, 0);

      return { label, value: txVal + leadVal, month, year };
    });
  }, [last12Months, transactions, leads]);

  const monthlyExpense = useMemo(() => {
    return last12Months.map(({ label, month, year }) => ({
      label,
      value: transactions
        .filter(t => {
          if (t.type !== 'expense') return false;
          const d = new Date(t.date);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    }));
  }, [last12Months, transactions]);

  // --- Income by category (transactions only) ---
  const incomeByCategory = useMemo(() =>
    Object.values(
      transactions
        .filter(t => t.type === 'income' && t.category)
        .reduce((acc: Record<string, { label: string; value: number }>, t) => {
          const key = t.category!;
          acc[key] = acc[key] || { label: key, value: 0 };
          acc[key].value += Math.abs(t.amount);
          return acc;
        }, {})
    ).sort((a, b) => b.value - a.value),
    [transactions]
  );

  const expenseByCategory = useMemo(() =>
    Object.values(
      transactions
        .filter(t => t.type === 'expense' && t.category)
        .reduce((acc: Record<string, { label: string; value: number }>, t) => {
          const key = t.category!;
          acc[key] = acc[key] || { label: key, value: 0 };
          acc[key].value += Math.abs(t.amount);
          return acc;
        }, {})
    ).sort((a, b) => b.value - a.value),
    [transactions]
  );

  // --- Income by lead source (origin) ---
  const incomeBySource = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l: any) => {
      const val = (l.valor_recebido ?? 0) + (l.taxa_matricula_recebido ?? 0);
      if (val <= 0) return;
      const src = l.lead_source?.trim() || 'Orgânico';
      map[src] = (map[src] || 0) + val;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  // --- Seller revenue with split Pluppex/Target commissions ---
  const sellerRevenue = useMemo((): SellerRevenueItem[] => {
    const map: Record<string, number> = {};
    turmas.forEach(t => {
      t.attendees
        .filter((a: any) => a.status !== 'cancelado' && a.responsible)
        .forEach((a: any) => {
          const key = a.responsible as string;
          map[key] = (map[key] || 0) + (a.valor_recebido ?? 0);
        });
    });
    return Object.entries(map)
      .map(([seller, revenue]) => {
        const rates = commissionRates[seller] ?? { pluppex: 0, target: 0 };
        const pluppex_commission = revenue * (rates.pluppex / 100);
        const target_commission = revenue * (rates.target / 100);
        return {
          seller,
          revenue,
          pluppex_rate: rates.pluppex,
          target_rate: rates.target,
          pluppex_commission,
          target_commission,
          total_commission: pluppex_commission + target_commission,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [turmas, commissionRates]);

  // --- DRE ---
  const dre = useMemo((): DREData => {
    const receitaCursos = turmaIncome;
    const receitaTaxaMatricula = taxaMatriculaTotal;
    const receitaTransacoes = txIncome;
    const receitaTotal = receitaCursos + receitaTaxaMatricula + receitaTransacoes;
    const despesaTotal = totalExpense;
    const resultadoBruto = receitaTotal - despesaTotal;
    const margemBruta = receitaTotal > 0 ? (resultadoBruto / receitaTotal) * 100 : 0;
    const pluppexCommissionsTotal = sellerRevenue.reduce((s, sr) => s + sr.pluppex_commission, 0);
    const targetCommissionsTotal = sellerRevenue.reduce((s, sr) => s + sr.target_commission, 0);
    const totalCommissions = pluppexCommissionsTotal + targetCommissionsTotal;
    const resultadoLiquido = resultadoBruto - totalCommissions;
    const margemLiquida = receitaTotal > 0 ? (resultadoLiquido / receitaTotal) * 100 : 0;
    return {
      receitaCursos,
      receitaTaxaMatricula,
      receitaTransacoes,
      receitaTotal,
      despesaTotal,
      resultadoBruto,
      margemBruta,
      pluppexCommissionsTotal,
      targetCommissionsTotal,
      totalCommissions,
      resultadoLiquido,
      margemLiquida,
    };
  }, [turmaIncome, taxaMatriculaTotal, txIncome, totalExpense, sellerRevenue]);

  return {
    txIncome,
    turmaIncome,
    taxaMatriculaTotal,
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
    incomeBySource,
    sellerRevenue,
    dre,
    commissionRates,
  };
}
