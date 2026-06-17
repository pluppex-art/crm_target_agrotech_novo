# TODO - Fix Dashboard Leads Count / Gráficos Zerados

## Passo 1 — Depurar origem da contagem
- [ ] Validar no front (useSalesMetrics) se `leads` carregados em `useLeadStore` está correto.
- [ ] Adicionar logs/indicadores internos (somente dev) para comparar:
  - `leads.length`
  - `filteredLeads.length`
  - contagens por estágio/status excluídos.

## Passo 2 — Corrigir KPI “Total de Leads” e gráficos
- [x] Alterar `useSalesMetrics` para que `leadsCount` (KPI) passe a ser a contagem de **todos os leads cadastrados** (opção A).
- [ ] Garantir que o “funil/pipeline/tendências” usem `leads`/`filteredLeads` corretamente sem ficar zerando por exclusões.


## Passo 3 — Validar build e evitar regressões
- [ ] Rodar `npm run build`.
- [ ] Confirmar que “Total de Leads” mostra ~1300.

## Passo 4 — Se ainda zerar, corrigir fetch do Supabase
- [ ] Revisar `supabaseService.getLeads` e `useLeadStore.fetchLeads` para remover filtros indevidos.

