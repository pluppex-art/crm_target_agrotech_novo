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
  id: string;
  label: string;
  value: number;
  received: number;
  count: number;
  percentage: number;
  leads_goal: number;
  leads?: any[];
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
  currentSellerId?: string | null,
): Array<{ id: string; label: string; value: number; received: number; count: number; leads?: any[] }> {
  const result: Record<string, { id: string; label: string; value: number; received: number; count: number; leads: any[] }> = {};

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);

  const processedLeads = new Set<string>();

  leads.forEach((l) => {
    if (!l.id) return;
    if (processedLeads.has(l.id)) return;
    processedLeads.add(l.id);

    if (!l.responsavel_usuario_id) return;

    const rawKey = l.responsavel_usuario_id;

    if (filterProduct && filterProduct !== 'all' && l.product !== filterProduct) return;
    
    if (currentSellerId && rawKey !== currentSellerId) return;

    if (!result[rawKey]) {
      result[rawKey] = { id: rawKey, label: l.responsible || 'Sem Nome', value: 0, received: 0, count: 0, leads: [] };
    }

    const isClosed = stageNameToStatus(l.status ?? '') === 'closed' ||
                    (l.stage_id && pipelines.some(p => p.stages.some(s => s.id === l.stage_id && stageNameToStatus(s.name) === 'closed')));
    
    // 1. Data da Venda (Contagem)
    const winDate = isClosed ? (l.won_at || l.created_at) : l.created_at;
    const cWinDate = new Date(winDate);
    // Normalize to local date by adding offset if needed or just comparing YYYY-MM-DD
    const inWinRange = (!start || cWinDate >= start) && (!end || cWinDate <= end);

    const isStrictlyWon = (l: any) => {
      if (!l.won_at) return false;
      const wDate = new Date(l.won_at);
      return (!start || wDate >= start) && (!end || wDate <= end);
    };

    if (isStrictlyWon(l)) {
      result[rawKey].count += 1;
      result[rawKey].value += getLeadEffectiveValue(l as any);
      
      const prod = products.find(p => p.id === l.product || p.name === l.product);
      const productName = prod ? prod.name : l.product;
      const wDate = new Date(l.won_at || l.created_at);
      const formattedWonAt = wDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      
      result[rawKey].leads.push({ ...l, productName, formattedWonAt });
    }

    // 2. Receita Fatiada (Semáforo)
    const tInfo = leadToTurma[l.id];

    // Se o lead está num estágio "conclu" mas não tem turma mapeada, não é possível
    // verificar o mês da turma → ignora received para evitar contabilizar meses anteriores.
    const stageNameForLead = l.stage_id
      ? pipelines.flatMap(p => p.stages).find(s => s.id === l.stage_id)?.name || ''
      : '';
    if (!tInfo && stageNameForLead.toLowerCase().includes('conclu')) return;

    const attendee = tInfo?.attendee;
    const feeVal = Number(attendee?.taxa_matricula_recebido || l.taxa_matricula_recebido || 0);

    const isConcluStage = stageNameForLead.toLowerCase().includes('conclu');

    // Data de referência para receita:
    // - Turma concluída: tInfo.date (data da turma é autoritativa — paid_at é auto-timestamp de entrada)
    // - Ganho ativo: won_at (quando o lead foi ganho — único timestamp confiável para ganhos sem turma)
    const revenueDate = (isConcluStage && tInfo?.date)
      ? new Date(`${tInfo.date}T12:00:00`)
      : l.won_at
        ? new Date(l.won_at)
        : null;

    if (!revenueDate) return;
    const inRevenueRange = (!start || revenueDate >= start) && (!end || revenueDate <= end);
    if (!inRevenueRange) return;

    // A) Taxa de Matrícula
    if (feeVal > 0) {
      result[rawKey].received += feeVal;
    }

    // B) Valor da Turma
    if (isClosed) {
      const valorRecebido = Number(attendee?.valor_recebido || l.valor_recebido || 0);
      if (valorRecebido > 0) {
        result[rawKey].received += valorRecebido;
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
  const byId: Record<string, SellerRankingItem & { profileId?: string; id?: string }> = {};

  const individualGoalIds = new Set(goals.filter(g => g.type === 'seller').map(g => g.seller_id).filter(Boolean));

  const sellerGoalMap = goals.reduce<Record<string, { leads_goal: number; revenue_goal: number }>>((acc, g) => {
    const data = { leads_goal: g.leads_goal || 0, revenue_goal: g.revenue_goal || 0 };
    if (g.seller_id) acc[g.seller_id.trim()] = data;
    return acc;
  }, {});

  // 1. Quem vendeu
  salesByResponsible.forEach((s) => {
    const sellerId = s.id;
    if (!sellerId) return;

    const profile = profiles.find(p => p.id === sellerId);
    if (profile?.status === 'inactive') return;
    const isOfficialVendedor = profile ? isVendedor(profile) : false;
    const hasIndividualGoal = individualGoalIds.has(sellerId);

    if (isOfficialVendedor || hasIndividualGoal) {
      byId[sellerId] = {
        ...s,
        label: profile?.name || s.label || 'Sem Nome',
        percentage: 0,
        leads_goal: 0,
        profileId: sellerId,
      };
    }
  });

  // 2. Vendedores sem venda
  vendedorProfiles.forEach((p) => {
    const sellerId = p.id;
    if (sellerId && !byId[sellerId]) {
      const name = p.name || 'Sem Nome';
      byId[sellerId] = { id: sellerId, label: name, value: 0, received: 0, count: 0, percentage: 0, leads_goal: 0, profileId: p.id, leads: [] };
    }
  });

  // 3. Percentuais e metas
  const maxCount = Math.max(...Object.values(byId).map(s => s.count), 1);
  Object.values(byId).forEach((s: any) => {
    const goal = s.id ? sellerGoalMap[s.id] : null;
    s.leads_goal = goal?.leads_goal ?? 0;
    s.percentage = goal && goal.leads_goal > 0 ? Math.round((s.count / goal.leads_goal) * 100) : 0;
    if (s.percentage === 0 && s.count > 0) s.percentage = Math.round((s.count / maxCount) * 100);
  });

  return Object.values(byId).sort((a: any, b: any) => b.count - a.count || b.percentage - a.percentage) as SellerRankingItem[];
}

/**
 * Gera o semáforo de vendedores (receita vs meta monetária).
 */
export function calcSellerSemaphore(
  allSellersRanking: SellerRankingItem[],
  otherSellersRanking: Array<{ id: string; label: string; value: number; received: number; count: number }>,
  goals: Goal[],
): SellerSemaphoreItem[] {
  const sellerGoalMap = goals.reduce<Record<string, { leads_goal: number; revenue_goal: number }>>((acc, g) => {
    const data = { leads_goal: g.leads_goal || 0, revenue_goal: g.revenue_goal || 0 };
    if (g.seller_id) acc[g.seller_id.trim()] = data;
    return acc;
  }, {});

  return [...allSellersRanking, ...otherSellersRanking].map((s: any) => {
    const goal = s.id ? sellerGoalMap[s.id] : null;
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
