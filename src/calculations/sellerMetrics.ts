/**
 * calculations/sellerMetrics.ts
 *
 * Cálculo de ranking e semáforo dos vendedores.
 *  - salesByResponsible  → vendas agrupadas por vendedor no período
 *  - allSellersRanking   → ranking com meta e percentual
 *  - otherSellersRanking → vendedores sem cargo oficial
 *  - sellerSemaphoreData → cor do semáforo baseado em receita vs meta
 */
import { financialCalculator } from '../services/financialCalculator';
import { isVendedor, getLeadEffectiveValue, stageNameToStatus } from '../lib/utils';
import type { Product } from '../services/productService';

interface Lead {
  id: string;
  responsible?: string | null;
  product?: string | null;
  created_at: string;
  updated_at?: string;
  status?: string;
  stage_id?: string;
  won_at?: string | null;
  value?: string | number;
  discount?: string | number;
  discount_applied?: boolean;
  valor_recebido?: number | null;
  taxa_matricula_recebido?: number | null;
  [key: string]: any;
}

interface Pipeline {
  stages: Array<{ id: string; name: string }>;
}

interface Profile {
  id: string;
  name?: string;
  cargos?: { name?: string };
  role?: string;
  cargo?: string;
  [key: string]: any;
}

interface Goal {
  type: string;
  seller_id?: string;
  seller_name?: string;
  leads_goal?: number;
  revenue_goal?: number;
}

export interface SellerRankingItem {
  label: string;
  value: number;
  received: number;
  count: number;
  percentage: number;
  leads_goal: number;
}

export interface SellerSemaphoreItem extends SellerRankingItem {
  revenue_goal: number;
  pct: number;
  color: 'red' | 'yellow' | 'green' | 'gold';
  colorClass: string;
  barColor: string;
}

/**
 * Agrupa vendas por vendedor responsável no período.
 */
export function calcSalesByResponsible(
  leads: Lead[],
  pipelines: Pipeline[],
  products: Product[],
  leadToTurma: Record<string, any> = {},
  startDate?: string,
  endDate?: string,
  filterProduct?: string,
  currentSellerName?: string | null,
): Array<{ label: string; value: number; received: number; count: number }> {
  const result: Record<string, { label: string; value: number; received: number; count: number }> = {};

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);

  const globalTargetSeller = (currentSellerName || '').trim().toLowerCase();

  const processedLeads = new Set<string>();

  leads.forEach((l) => {
    if (!l.id) return;
    if (processedLeads.has(l.id)) return;
    processedLeads.add(l.id);

    if (!l.responsible) return;

    const rawKey = l.responsible.trim();
    const lowerKey = rawKey.toLowerCase();

    if (filterProduct && filterProduct !== 'all' && l.product !== filterProduct) return;
    if (globalTargetSeller && lowerKey !== globalTargetSeller) return;

    if (!result[lowerKey]) {
      result[lowerKey] = { label: rawKey, value: 0, received: 0, count: 0 };
    }

    // A data da venda agora é baseada estritamente no novo campo won_at.
    // Se o lead está fechado e tem won_at, usamos essa data.
    // Caso contrário, usamos a data de criação.
    const isClosed = stageNameToStatus(l.status ?? '') === 'closed' ||
                    (l.stage_id && pipelines.some(p => p.stages.some(s => s.id === l.stage_id && stageNameToStatus(s.name) === 'closed')));
    
    const leadDate = (isClosed && l.won_at) ? l.won_at : l.created_at;
    const cDate = new Date(leadDate);

    if ((!start || cDate >= start) && (!end || cDate <= end)) {
      if (isClosed) {
        result[lowerKey].count += 1;
        result[lowerKey].value += getLeadEffectiveValue(l as any);
        result[lowerKey].received += financialCalculator.getPaidAmount(l as any, products);
      }
    }
  });

  return Object.values(result).sort((a, b) => b.count - a.count);
}

/**
 * Gera o ranking completo de vendedores com metas.
 */
export function calcAllSellersRanking(
  salesByResponsible: ReturnType<typeof calcSalesByResponsible>,
  vendedorProfiles: Profile[],
  profiles: Profile[],
  goals: Goal[],
): SellerRankingItem[] {
  const byName: Record<string, SellerRankingItem & { profileId?: string }> = {};

  const individualGoalIds = new Set(goals.filter(g => g.type === 'seller').map(g => g.seller_id).filter(Boolean));
  const individualGoalNames = new Set(goals.filter(g => g.type === 'seller').map(g => g.seller_name?.trim()).filter(Boolean));

  const sellerGoalMap = goals.reduce<Record<string, { leads_goal: number; revenue_goal: number }>>((acc, g) => {
    const data = { leads_goal: g.leads_goal || 0, revenue_goal: g.revenue_goal || 0 };
    if (g.seller_name) acc[g.seller_name.trim()] = data;
    if (g.seller_id) acc[g.seller_id.trim()] = data;
    return acc;
  }, {});

  // 1. Quem vendeu
  salesByResponsible.forEach((s) => {
    const trimmedLabel = s.label.trim();
    if (!trimmedLabel) return;

    const profile = profiles.find(p => p.name?.trim().toLowerCase() === trimmedLabel.toLowerCase());
    const isOfficialVendedor = profile ? isVendedor(profile) : false;
    const hasIndividualGoal = individualGoalNames.has(trimmedLabel) || (profile && individualGoalIds.has(profile.id));

    if (isOfficialVendedor || hasIndividualGoal) {
      byName[trimmedLabel] = {
        ...s, label: trimmedLabel, percentage: 0, leads_goal: 0,
        profileId: profile?.id,
      };
    }
  });

  // 2. Vendedores sem venda
  vendedorProfiles.forEach((p) => {
    const name = (p.name || '').trim();
    if (name && !byName[name]) {
      byName[name] = { label: name, value: 0, received: 0, count: 0, percentage: 0, leads_goal: 0, profileId: p.id };
    }
  });

  // 3. Percentuais e metas
  const maxCount = Math.max(...Object.values(byName).map(s => s.count), 1);
  Object.values(byName).forEach((s: any) => {
    const goal = sellerGoalMap[s.label.trim()] || (s.profileId ? sellerGoalMap[s.profileId] : null);
    s.leads_goal = goal?.leads_goal ?? 0;
    s.percentage = goal && goal.leads_goal > 0 ? Math.round((s.count / goal.leads_goal) * 100) : 0;
    if (s.percentage === 0 && s.count > 0) s.percentage = Math.round((s.count / maxCount) * 100);
  });

  return Object.values(byName).sort((a: any, b: any) => b.count - a.count || b.percentage - a.percentage) as SellerRankingItem[];
}

/**
 * Gera o semáforo de vendedores (receita vs meta monetária).
 */
export function calcSellerSemaphore(
  allSellersRanking: SellerRankingItem[],
  otherSellersRanking: Array<{ label: string; value: number; received: number; count: number }>,
  goals: Goal[],
): SellerSemaphoreItem[] {
  const sellerGoalMap = goals.reduce<Record<string, { leads_goal: number; revenue_goal: number }>>((acc, g) => {
    const data = { leads_goal: g.leads_goal || 0, revenue_goal: g.revenue_goal || 0 };
    if (g.seller_name) acc[g.seller_name.trim()] = data;
    if (g.seller_id) acc[g.seller_id.trim()] = data;
    return acc;
  }, {});

  return [...allSellersRanking, ...otherSellersRanking].map((s: any) => {
    const goal = sellerGoalMap[s.label.trim()];
    const revGoal = goal?.revenue_goal ?? 0;

    let pct = 0;
    if (revGoal > 0) {
      pct = Math.round((s.received / revGoal) * 100);
    } else if (s.count > 0 || s.received > 0) {
      pct = 100;
    }

    let color: 'red' | 'yellow' | 'green' | 'gold';
    let colorClass: string;
    let barColor: string;

    if (pct < 50) {
      color = 'red'; colorClass = 'bg-red-50 text-red-700 border-red-200'; barColor = '#ef4444';
    } else if (pct < 70) {
      color = 'yellow'; colorClass = 'bg-amber-50 text-amber-700 border-amber-200'; barColor = '#f59e0b';
    } else if (pct <= 100) {
      color = 'green'; colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'; barColor = '#10b981';
    } else {
      color = 'gold'; colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200'; barColor = '#fbbf24';
    }

    return { ...s, pct, color, colorClass, barColor, revenue_goal: revGoal };
  }).sort((a, b) => b.pct - a.pct);
}
