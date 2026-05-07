/**
 * calculations/transactionMetrics.ts
 *
 * Cálculo de métricas da aba Transações (Financeiro):
 *  - filterTransactions → filtra transações por squad, tipo, status e texto
 *  - calcTransactionSummary → totais de entradas/saídas/saldo por período
 *  - calcOverdueCount → contagem de transações vencidas e não pagas
 */

export interface Transaction {
  id: string;
  type: string;        // 'INCOME' | 'EXPENSE'
  status: string;      // 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'
  amount: number | string;
  description: string;
  origin_type?: string;
  payment_date?: string;
  due_date?: string;
  created_at: string;
  leads?: { responsible?: string | null } | null;
  [key: string]: any;
}

export interface TransactionSummary {
  totalIncome: number;       // Entradas pagas
  totalExpense: number;      // Saídas pagas
  pendingIncome: number;     // A receber
  pendingExpense: number;    // A pagar
  overdueIncome: number;     // Entradas vencidas
  overdueExpense: number;    // Saídas vencidas
  netBalance: number;        // Entradas pagas − Saídas pagas
}

type Profile = { name?: string; department?: string };

function getSquadForName(name: string | null | undefined, profiles: Profile[]): string | null {
  if (!name) return null;
  return profiles.find(p => p.name === name)?.department?.toUpperCase() ?? null;
}

/**
 * Filtra transações por squad, tipo, status e termo de busca.
 * Exclui transações de comissão do histórico por padrão.
 */
export function filterTransactions(
  transactions: Transaction[],
  profiles: Profile[],
  opts: {
    selectedSquad?: string;
    filterType?: string;
    filterStatus?: string;
    searchTerm?: string;
    excludeCommissions?: boolean;
  } = {},
): Transaction[] {
  const {
    selectedSquad = 'all',
    filterType = 'all',
    filterStatus = 'all',
    searchTerm = '',
    excludeCommissions = true,
  } = opts;

  return transactions.filter(t => {
    if (excludeCommissions && t.origin_type === 'COMMISSION') return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;

    if (selectedSquad !== 'all') {
      const respName = t.leads?.responsible || (t as any).responsible;
      if (getSquadForName(respName, profiles) !== selectedSquad) return false;
    }

    if (searchTerm.trim()) {
      return t.description.toLowerCase().includes(searchTerm.toLowerCase());
    }

    return true;
  });
}

/**
 * Agrupa totais por tipo e status.
 */
export function calcTransactionSummary(transactions: Transaction[]): TransactionSummary {
  let totalIncome = 0, totalExpense = 0;
  let pendingIncome = 0, pendingExpense = 0;
  let overdueIncome = 0, overdueExpense = 0;

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    const isIncome = t.type === 'INCOME';

    if (t.status === 'PAID') {
      if (isIncome) totalIncome += amt;
      else          totalExpense += amt;
    } else if (t.status === 'PENDING') {
      if (isIncome) pendingIncome += amt;
      else          pendingExpense += amt;
    } else if (t.status === 'OVERDUE') {
      if (isIncome) overdueIncome += amt;
      else          overdueExpense += amt;
    }
  }

  return {
    totalIncome,
    totalExpense,
    pendingIncome,
    pendingExpense,
    overdueIncome,
    overdueExpense,
    netBalance: totalIncome - totalExpense,
  };
}

/**
 * Conta transações vencidas não pagas (OVERDUE).
 */
export function calcOverdueCount(transactions: Transaction[]): number {
  return transactions.filter(t => t.status === 'OVERDUE').length;
}
