/**
 * calculations/index.ts
 *
 * Ponto central de exportação de todos os cálculos do sistema.
 * Importe daqui para não precisar saber em qual arquivo está cada função.
 *
 * ─── Pipeline ──────────────────────────────────────────────────────────────────
 *  pipelineMetrics    → PAGO/PENDENTE do Pipeline (Ganho + turmas do mês)
 *
 * ─── Dashboard ─────────────────────────────────────────────────────────────────
 *  dashboardMetrics   → PAGO/PENDENTE do Dashboard (turmas por período)
 *
 * ─── Financeiro (sub-páginas) ──────────────────────────────────────────────────
 *  cashFlowMetrics    → KPIs do Fluxo de Caixa (entradas, saídas, saldo, margem)
 *  transactionMetrics → Filtros e totais das Transações
 *  dreMetrics         → Helpers de exibição do DRE
 *  oteMetrics         → Agrupamentos e totais do OTE / Comissões
 *  partnerMetrics     → Split, taxas e margem da Parceria Target × Pluppex
 *
 * ─── Pessoas / Equipe ──────────────────────────────────────────────────────────
 *  sellerMetrics      → Ranking e Semáforo dos Vendedores
 *
 * ─── Turmas ────────────────────────────────────────────────────────────────────
 *  turmaMetrics       → Ocupação das turmas, distribuição de alunos
 *
 * ─── Leads ─────────────────────────────────────────────────────────────────────
 *  leadMetrics        → Conversão, ciclo de vendas, leads ativos/inativos
 */

export * from './pipelineMetrics';
export * from './dashboardMetrics';
export * from './cashFlowMetrics';
export * from './transactionMetrics';
export * from './dreMetrics';
export * from './oteMetrics';
export * from './partnerMetrics';
export * from './sellerMetrics';
export * from './turmaMetrics';
export * from './leadMetrics';
