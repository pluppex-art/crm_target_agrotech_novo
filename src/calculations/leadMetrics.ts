/**
 * calculations/leadMetrics.ts
 *
 * Cálculo de métricas de Leads (Dashboard e Pipeline):
 *  - closedLeadsCount    → leads fechados/ganhos no período
 *  - conversionRate      → taxa de conversão (fechados / total)
 *  - averageSalesCycle   → ciclo médio de vendas em dias
 *  - inactiveLeadsCount  → leads sem atividade recente
 *  - activeLeadsCount    → leads em estágios ativos
 *  - totalSalesValue     → soma dos valores efetivos dos fechados
 *  - totalConversionRate → fechados / ativos
 */
import { getLeadEffectiveValue, stageNameToStatus } from '../lib/utils';

interface Lead {
  id: string;
  status?: string;
  stage_id?: string;
  created_at: string;
  updated_at?: string;
  name?: string;
  product?: string;
  product_id?: string;
  responsible?: string;
  value?: string | number;
  [key: string]: any;
}

interface Task {
  id: string;
  lead_id?: string;
  status?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
}

interface Pipeline {
  stages: Array<{ id: string; name: string; position: number; color: string }>;
}

const EXCLUDED_STAGE_NAMES = new Set(['Perdido', 'Desqualificado']);

function isClosedLead(lead: Lead, stageMap: Map<string, string>): boolean {
  if (lead.status === 'closed' || stageNameToStatus(lead.status ?? '') === 'closed') return true;
  if (lead.stage_id) {
    const stageName = stageMap.get(lead.stage_id);
    if (stageName && stageNameToStatus(stageName) === 'closed') return true;
  }
  return false;
}

/** Retorna o Map de id→name para todos os pipelines. */
export function buildStageMap(pipelines: Pipeline[]): Map<string, string> {
  const map = new Map<string, string>();
  pipelines.forEach(p => {
    p.stages?.forEach(s => map.set(s.id, s.name));
  });
  return map;
}

/** Leads fechados dentro dos filteredLeads. */
export function calcClosedLeads(filteredLeads: Lead[], stageMap: Map<string, string>): Lead[] {
  const processed = new Set<string>();
  return filteredLeads.filter(l => {
    if (!l.id || processed.has(l.id)) return false;
    processed.add(l.id);
    return isClosedLead(l, stageMap);
  });
}

/** Taxa de conversão: fechados / total (0–100). */
export function calcConversionRate(closedCount: number, totalCount: number): number {
  return totalCount > 0 ? (closedCount / totalCount) * 100 : 0;
}

/** Ciclo médio de vendas em dias para os leads fechados. */
export function calcAverageSalesCycle(closedLeads: Lead[]): number {
  if (closedLeads.length === 0) return 0;
  const totalDays = closedLeads.reduce((sum, l) => {
    const created = new Date(l.created_at).getTime();
    const updated = new Date(l.won_at || l.updated_at || l.created_at).getTime();
    const diffDays = Math.round((updated - created) / (1000 * 60 * 60 * 24));
    return sum + (diffDays === 0 ? 1 : diffDays);
  }, 0);
  return Math.round(totalDays / closedLeads.length);
}

/** Leads sem atividade nos últimos 2 dias. */
export function calcInactiveLeads(
  filteredLeads: Lead[],
  tasks: Task[],
  stageMap: Map<string, string>,
): number {
  const now         = Date.now();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  const processed   = new Set<string>();
  return filteredLeads.filter(l => {
    if (!l.id || processed.has(l.id)) return false;
    processed.add(l.id);

    if (isClosedLead(l, stageMap)) return false;

    const stageName = l.stage_id ? stageMap.get(l.stage_id) : l.status;
    if (stageName && (
      stageName.toLowerCase().includes('perdido') ||
      stageName.toLowerCase().includes('desqualificado')
    )) return false;

    const lastUpdate    = new Date(l.updated_at || l.created_at).getTime();
    const hasRecentUpdate = (now - lastUpdate) <= TWO_DAYS_MS;

    const hasRecentTask = tasks.some(t => {
      if (t.lead_id !== l.id) return false;
      if (t.status === 'pending' && t.due_date && new Date(t.due_date).getTime() >= now) return true;
      const taskTime = new Date((t as any).updated_at || t.created_at).getTime();
      return (now - taskTime) <= TWO_DAYS_MS;
    });

    return !hasRecentUpdate && !hasRecentTask;
  }).length;
}

/** Leads em estágios ativos (exclui Perdido, Desqualificado e filtros). */
export function calcActiveLeads(
  leads: Lead[],
  stageMap: Map<string, string>,
  opts: {
    searchTerm?: string;
    filterProduct?: string;
    filterResponsible?: string;
    currentSellerId?: string | null;
  } = {},
): number {
  const processed = new Set<string>();
  return leads.filter(l => {
    if (!l.id || processed.has(l.id)) return false;
    processed.add(l.id);

    const { searchTerm, filterProduct, filterResponsible, currentSellerId } = opts;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!l.name?.toLowerCase().includes(q) && !l.product?.toLowerCase().includes(q) && !l.responsible?.toLowerCase().includes(q)) return false;
    }
    if (filterProduct && filterProduct !== 'all' && (l.product_id ?? l.product) !== filterProduct) return false;
    if (filterResponsible && filterResponsible !== 'all' && l.responsavel_usuario_id !== filterResponsible) return false;
    if (currentSellerId && l.responsavel_usuario_id !== currentSellerId) return false;

    const stageName = l.stage_id ? stageMap.get(l.stage_id) : l.status;
    if (!stageName) return true;
    return !EXCLUDED_STAGE_NAMES.has(stageName) &&
      !stageName.toLowerCase().includes('perdido') &&
      !stageName.toLowerCase().includes('desqualificado');
  }).length;
}

/** Soma dos valores efetivos dos leads fechados. */
export function calcTotalSalesValue(closedLeads: Lead[]): number {
  return closedLeads.reduce((s, l) => s + getLeadEffectiveValue(l as any), 0);
}
