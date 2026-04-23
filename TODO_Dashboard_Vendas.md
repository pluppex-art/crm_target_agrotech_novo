# TODO: Dashboard Vendas Fixes & Enhancements
Current progress: 18/18 ✅

## 1. Preparation (2 steps)
- [x] 1.1 Read remaining files: src/components/finance/DateFilter.tsx, src/components/dashboard/ImprovedCSSBarChart.tsx, src/store/useFinanceStore.ts
- [x] 1.2 Add period filter state/logic in Dashboard.tsx (default last 30 days)

## 2. Utils Helpers (5 steps)
- [x] 2.1 utils.ts: `isVendedor(profile): boolean` → checks cargos.name, role, cargo fields with case-insensitive matching
- [x] 2.2 utils.ts: `getSellerIncome(turmas, sellerName, startDate, endDate): number` → sum valor_recebido (status!='cancelado', date filter)
- [x] 2.3 utils.ts: `getOccupancyData(turmas): Array<{name, pct, level:'red'|'yellow'|'green', alunos, color}>`
- [x] 2.4 utils.ts: `computeFunnelRates(pipelineStages): Array<{label, count, rate_from_prev}>`
- [x] 2.5 utils.ts: `projectedRevenue(funnel_rate, monthly_leads_avg, avg_ticket, months=3): Array<{label, value}>`

## 3. Cards & Metrics (2 steps)
- [x] 3.1 Cards: Replace closedLeads.length → sum ganhos (total/my/team) using getSellerIncome
- [x] 3.2 Filter vendedores strictly with isVendedor

## 4. Ranking (1 step)
- [x] 4.1 Ranking: Strict Vendedor filter via Set, dedupe by name, show all vendedores (even with 0 sales)

## 5. Taxa Ocupação (2 steps)
- [x] 5.1 Compute occupancyData in Dashboard
- [x] 5.2 Replace Vendas por Produto → ImprovedCSSBarChart with per-bar colors/levels

## 6. Funil Conversão (2 steps)
- [x] 6.1 Compute stage-to-stage rates + total paid/all leads
- [x] 6.2 Update FunnelChart props

## 7. Tendência Preditiva (1 step)
- [x] 7.1 Extend monthlySales → historical + projection line

## 8. Charts Swap (2 steps)
- [x] 8.1 Meta Geral: LineTrendChart stacked (paid vs goal sum), last row
- [x] 8.2 Pipeline → Turma FunnelChart, swap positions

## 9. Polish & Test (3 steps)
- [x] 9.1 Add loading states for new computations
- [x] 9.2 Visual tweaks (colors, labels 'Taxa de Ocupação', levels)
- [x] 9.3 Test with data: Verify cards/ranking/ocupação/funil/prediction/meta/pipeline

## 10. Code Organization (Major Refactor)
- [x] 10.1 Extract `useSalesMetrics` hook (src/hooks/useSalesMetrics.ts) - all sales computations
- [x] 10.2 Extract `useFinanceMetrics` hook (src/hooks/useFinanceMetrics.ts) - all finance computations
- [x] 10.3 Extract `SalesOverview` component - sales cards + ranking + occupancy
- [x] 10.4 Extract `PipelineFunnel` component - doughnut + funnel charts
- [x] 10.5 Extract `TrendsSection` component - trends + turma funnel + goals
- [x] 10.6 Extract `FinanceOverview` component - finance cards + charts
- [x] 10.7 Shrink Dashboard.tsx from ~800 lines to ~150 lines
- [x] 10.8 Build passes successfully

**Status:** ✅ COMPLETE - All 18/18 steps done + code organization refactor

