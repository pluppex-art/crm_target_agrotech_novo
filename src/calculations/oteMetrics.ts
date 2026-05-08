/**
 * calculations/oteMetrics.ts
 *
 * Helpers de exibição do OTE (On Target Earnings / Comissões).
 * O cálculo pesado é feito pelo oteService (server-side via RPC);
 * este arquivo trata agrupamentos e totais para exibição front-end.
 *
 *  - groupResultsByRole → separa resultados em sellers e managers
 *  - calcOteSummary     → totais consolidados do período
 *  - filterBySquad      → filtra resultados por squad_id
 */
import { CommissionResult } from '../types/finance_v2';

export interface OteSummary {
  totalCommissions: number;   // Soma de variable_amount
  totalAccelerator: number;   // Soma de accelerator_amount
  totalOte: number;           // Soma de total_amount
  totalRevenue: number;       // Soma de realized_revenue
  sellerCount: number;
  managerCount: number;
}

/**
 * Filtra resultados OTE por squad.
 */
export function filterOteBySquad(
  results: CommissionResult[],
  squadId: string,
): CommissionResult[] {
  if (squadId === 'all') return results;
  return results.filter(r => r.squad_id === squadId);
}

/**
 * Separa os resultados entre vendedores (Closers/SDRs) e gestores.
 */
export function groupOteByRole(results: CommissionResult[]): {
  sellers: CommissionResult[];
  managers: CommissionResult[];
} {
  return {
    sellers:  results.filter(r => r.role_type === 'CLOSER' || r.role_type === 'SDR'),
    managers: results.filter(r => r.role_type === 'MANAGER'),
  };
}

/**
 * Consolida os totais do período OTE.
 */
export function calcOteSummary(results: CommissionResult[]): OteSummary {
  const { sellers, managers } = groupOteByRole(results);

  return {
    totalCommissions: results.reduce((s, r) => s + (r.variable_amount ?? 0), 0),
    totalAccelerator: results.reduce((s, r) => s + (r.accelerator_amount ?? 0), 0),
    totalOte:         results.reduce((s, r) => s + (r.total_amount      ?? 0), 0),
    totalRevenue:     results.reduce((s, r) => s + (r.realized_revenue   ?? 0), 0),
    sellerCount:      sellers.length,
    managerCount:     managers.length,
  };
}

/**
 * Retorna a cor do semáforo para um resultado OTE.
 */
export function oteStatusColor(result: CommissionResult): {
  bg: string; text: string; border: string;
} {
  const pct = result.achievement_percent ?? 0;
  if (pct >= 70) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
  if (pct >= 50) return { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' };
  return             { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' };
}
