/**
 * calculations/partnerMetrics.ts
 *
 * Helpers de cálculo da aba Parceria (Target × Pluppex).
 * A busca dos dados é feita pelo partnerRevenueService;
 * este arquivo trata os cálculos de distribuição e margem.
 *
 *  - calcPartnerSplit   → divide faturamento entre as squads
 *  - calcPartnerMargin  → calcula margem líquida da parceria
 *  - calcPluppexFees    → calcula repasses de tecnologia para a Pluppex
 */

export interface PartnerReport {
  total_revenue: number;
  target_sales: number;
  pluppex_sales: number;
  target_net_result: number;
  net_margin: number;
  pluppex_technology_fee: number;
  target_fee: number;
  pluppex_fee: number;
  chartData: Array<{ date: string; target: number; pluppex: number }>;
  _debug?: { txCount: number; leadCount: number };
}

export interface PartnerSplit {
  targetPct: number;     // % do total que veio da Target
  pluppexPct: number;    // % do total que veio da Pluppex
  targetAmount: number;
  pluppexAmount: number;
}

export interface PartnerFees {
  technologyTotal: number;   // pluppex_technology_fee
  targetFee: number;
  pluppexFee: number;
  totalFees: number;         // target_fee + pluppex_fee
}

/**
 * Calcula o percentual de participação de cada squad no faturamento.
 */
export function calcPartnerSplit(report: PartnerReport): PartnerSplit {
  const total = report.total_revenue || 1; // evita divisão por zero
  return {
    targetPct:    (report.target_sales  / total) * 100,
    pluppexPct:   (report.pluppex_sales / total) * 100,
    targetAmount:  report.target_sales,
    pluppexAmount: report.pluppex_sales,
  };
}

/**
 * Extrai os repasses financeiros para a Pluppex.
 */
export function calcPluppexFees(report: PartnerReport): PartnerFees {
  return {
    technologyTotal: report.pluppex_technology_fee,
    targetFee:       report.target_fee,
    pluppexFee:      report.pluppex_fee,
    totalFees:       (report.target_fee || 0) + (report.pluppex_fee || 0),
  };
}

/**
 * Calcula a margem líquida da parceria.
 */
export function calcPartnerMargin(report: PartnerReport): number {
  if (!report.total_revenue) return 0;
  return (report.target_net_result / report.total_revenue) * 100;
}

/**
 * Retorna o relatório com valores seguros (zeros em vez de undefined).
 */
export function safePartnerReport(report: PartnerReport | null): PartnerReport {
  return report ?? {
    total_revenue: 0,
    target_sales: 0,
    pluppex_sales: 0,
    target_net_result: 0,
    net_margin: 0,
    pluppex_technology_fee: 0,
    target_fee: 0,
    pluppex_fee: 0,
    chartData: [],
    _debug: { txCount: 0, leadCount: 0 },
  };
}
