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

export interface CommissionResult {
  id: string;
  user_id?: string;
  squad_id?: string;
  role_type: string;           // 'seller' | 'manager' | etc.
  base_salary?: number;
  ote_total?: number;
  commission_earned?: number;
  bonus_earned?: number;
  leads_closed?: number;
  revenue_generated?: number;
  achievement_pct?: number;
  semaphore_status?: string;   // 'green' | 'yellow' | 'red'
  [key: string]: any;
}

export interface OteSummary {
  totalCommissions: number;   // Soma de commission_earned
  totalBonus: number;         // Soma de bonus_earned
  totalOte: number;           // Soma de ote_total
  totalLeadsClosed: number;   // Soma de leads_closed
  totalRevenue: number;       // Soma de revenue_generated
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
 * Separa os resultados entre vendedores e gestores.
 */
export function groupOteByRole(results: CommissionResult[]): {
  sellers: CommissionResult[];
  managers: CommissionResult[];
} {
  return {
    sellers:  results.filter(r => r.role_type === 'seller'),
    managers: results.filter(r => r.role_type !== 'seller'),
  };
}

/**
 * Consolida os totais do período OTE.
 */
export function calcOteSummary(results: CommissionResult[]): OteSummary {
  const sellers  = results.filter(r => r.role_type === 'seller');
  const managers = results.filter(r => r.role_type !== 'seller');

  return {
    totalCommissions: results.reduce((s, r) => s + (r.commission_earned ?? 0), 0),
    totalBonus:       results.reduce((s, r) => s + (r.bonus_earned       ?? 0), 0),
    totalOte:         results.reduce((s, r) => s + (r.ote_total          ?? 0), 0),
    totalLeadsClosed: results.reduce((s, r) => s + (r.leads_closed       ?? 0), 0),
    totalRevenue:     results.reduce((s, r) => s + (r.revenue_generated  ?? 0), 0),
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
  const pct = result.achievement_pct ?? 0;
  if (pct >= 100) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
  if (pct >= 70)  return { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' };
  return             { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' };
}
