import { useMemo } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { useTurmaStore } from '../store/useTurmaStore';
import { useProfileStore } from '../store/useProfileStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { useTaskStore } from '../store/useTaskStore';
import { useProductStore } from '../store/useProductStore';
import { financialCalculator } from '../services/financialCalculator';
import {
  isVendedor,
  getSellerIncome,
  getOccupancyData,
  computeFunnelRates,
  projectedRevenue,
  getLeadEffectiveValue,
  stageNameToStatus,
} from '../lib/utils';

export interface SalesMetrics {
  totalGanhos: number;
  myGanhos: number;
  teamGanhos: number;
  leadsCount: number;
  closedLeadsCount: number;
  conversionRate: number;
  averageSalesCycle: number;
  inactiveLeadsCount: number;
  totalSalesValue: number;
  occupancyData: ReturnType<typeof getOccupancyData>;
  vendedorProfiles: any[];
  allSellersRanking: Array<{
    label: string;
    value: number;
    received: number;
    count: number;
    percentage: number;
    leads_goal: number;
  }>;
  otherSellersRanking: Array<{
    label: string;
    value: number;
    received: number;
    count: number;
  }>;
  sellerSemaphoreData: Array<{
    label: string;
    value: number;
    received: number;
    count: number;
    percentage: number;
    revenue_goal: number;
    pct: number;
    color: 'red' | 'yellow' | 'green' | 'gold';
    colorClass: string;
    barColor: string;
  }>;
  pipelineStages: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
  }>;
  funnelStagesWithRates: ReturnType<typeof computeFunnelRates>;
  monthlySales: Array<{ label: string; value: number }>;
  trendData: Array<{ label: string; value: number }>;
  totalConversionRate: number;
  attendeeStages: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
  }>;
  availableProducts: Array<{ value: string; label: string }>;
  availableResponsibles: Array<{ value: string; label: string }>;
}

interface UseSalesMetricsProps {
  currentSellerName?: string | null;
  startDate?: string;
  endDate?: string;
  goals?: Array<{
    type: string; seller_id?: string; seller_name?: string; leads_goal?: number; revenue_goal?: number
  }>;
  searchTerm?: string;
  filterStage?: string;
  filterProduct?: string;
  filterResponsible?: string;
}

export function useSalesMetrics({
  currentSellerName,
  startDate,
  endDate,
  goals = [],
  searchTerm = '',
  filterStage = 'all',
  filterProduct = 'all',
  filterResponsible = 'all',
}: UseSalesMetricsProps): SalesMetrics {
  const { leads } = useLeadStore();
  const { turmas } = useTurmaStore();
  const { profiles } = useProfileStore();
  const { pipelines } = usePipelineStore();
  const { tasks } = useTaskStore();
  const { products } = useProductStore();
  const vendedorProfiles = useMemo(() => profiles.filter(isVendedor), [profiles]);

  const availableProducts = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach((l: any) => { if (l.product) seen.add(l.product); });
    return Array.from(seen).sort().map(p => ({ value: p, label: p }));
  }, [leads]);

  const availableResponsibles = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach((l: any) => { if (l.responsible) seen.add(l.responsible); });
    return Array.from(seen).sort().map(r => ({ value: r, label: r }));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let result = leads as any[];

    // Date filtering
    if (startDate) {
      const start = new Date(startDate);
      result = result.filter(l => new Date(l.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.created_at) <= end);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.product?.toLowerCase().includes(q) ||
        l.responsible?.toLowerCase().includes(q)
      );
    }
    if (filterStage !== 'all') result = result.filter(l => l.stage_id === filterStage);
    if (filterProduct !== 'all') result = result.filter(l => l.product === filterProduct);
    if (filterResponsible !== 'all') result = result.filter(l => l.responsible === filterResponsible);

    // Privacy filter: if not admin, only show own data
    if (currentSellerName) {
      result = result.filter(l => l.responsible === currentSellerName);
    }

    return result;
  }, [leads, searchTerm, filterStage, filterProduct, filterResponsible, startDate, endDate, currentSellerName]);



  const closedLeadsFiltered = useMemo(() => {
    const pipeline = pipelines[0];
    const stageMap = new Map(pipeline?.stages?.map(s => [s.id, s.name]) || []);

    return filteredLeads.filter((l: any) => {
      // Check status field directly (legacy/manual)
      if (l.status === 'closed' || stageNameToStatus(l.status) === 'closed') return true;

      // Check via stage_id and stage name
      if (l.stage_id) {
        const stageName = stageMap.get(l.stage_id);
        if (stageName && stageNameToStatus(stageName) === 'closed') return true;
      }

      return false;
    });
  }, [filteredLeads, pipelines]);

  const closedLeadsCount = closedLeadsFiltered.length;

  const conversionRate =
    filteredLeads.length > 0 ? (closedLeadsCount / filteredLeads.length) * 100 : 0;

  const averageSalesCycle = useMemo(() => {
    if (closedLeadsFiltered.length === 0) return 0;
    
    const totalDays = closedLeadsFiltered.reduce((sum, l) => {
      const created = new Date(l.created_at).getTime();
      const updated = new Date(l.updated_at || l.created_at).getTime();
      let diffDays = Math.round((updated - created) / (1000 * 60 * 60 * 24));
      return sum + (diffDays === 0 ? 1 : diffDays); // Minimum 1 day
    }, 0);
    
    return Math.round(totalDays / closedLeadsFiltered.length);
  }, [closedLeadsFiltered]);

  const inactiveLeadsCount = useMemo(() => {
    const pipeline = pipelines[0];
    const stageMap = new Map(pipeline?.stages?.map(s => [s.id, s.name]) || []);
    
    const now = new Date().getTime();
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    
    return filteredLeads.filter((l: any) => {
      // Must NOT be closed (Ganho)
      const isClosed = l.status === 'closed' || stageNameToStatus(l.status) === 'closed' || 
                       (l.stage_id && stageNameToStatus(stageMap.get(l.stage_id) || '') === 'closed');
      if (isClosed) return false;
      
      // Must NOT be lost or disqualified
      const stageName = l.stage_id ? stageMap.get(l.stage_id) : l.status;
      if (stageName && (stageName.toLowerCase().includes('perdido') || stageName.toLowerCase().includes('desqualificado'))) return false;
      
      // Check for recent updates to the lead
      const lastUpdate = new Date(l.updated_at || l.created_at).getTime();
      const hasRecentUpdate = (now - lastUpdate) <= TWO_DAYS_MS;
      
      // Check for recent task activity or future scheduled tasks
      const hasRecentTask = tasks.some(t => {
        if (t.lead_id !== l.id) return false;
        
        // If it has a pending task scheduled for the future, it's NEVER inactive
        const isPendingFuture = t.status === 'pending' && t.due_date && new Date(t.due_date).getTime() >= now;
        if (isPendingFuture) return true;
        
        // Otherwise, check if the task was created recently
        const taskTime = new Date((t as any).updated_at || t.created_at).getTime();
        return (now - taskTime) <= TWO_DAYS_MS;
      });
      
      // If it has ANY recent activity (update or task) or a future scheduled task, it is NOT inactive
      if (hasRecentUpdate || hasRecentTask) return false;
      
      return true;
    }).length;
  }, [filteredLeads, pipelines, tasks]);


  const totalSalesValue = closedLeadsFiltered.reduce(
    (s: number, l: any) => s + getLeadEffectiveValue(l),
    0
  );

  const totalGanhos = useMemo(() => {
    return closedLeadsFiltered.reduce((sum, l) => {
      return sum + financialCalculator.getPaidAmount(l, products);
    }, 0);
  }, [closedLeadsFiltered, products]);

  const myGanhos = totalGanhos; // totalGanhos already considers currentSellerName/filterResponsible
  const teamGanhos = 0; // Not used in this view but keeping for compatibility

  const occupancyData = getOccupancyData(turmas);

  // Seller ranking: uses pipeline closed lead counts for ranking, and combined lead + turret payments for received
  const salesByResponsible = useMemo(() => {
    const result: Record<string, { label: string; value: number; received: number; count: number }> = {};
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);
    
    const globalTargetSeller = (currentSellerName || '').trim().toLowerCase();

    // 1. Process Leads
    leads.forEach((l: any) => {
      if (l.responsible) {
        const rawKey = l.responsible.trim();
        const lowerKey = rawKey.toLowerCase();
        
        if (filterProduct !== 'all' && l.product !== filterProduct) return;
        if (globalTargetSeller && lowerKey !== globalTargetSeller) return;

        if (!result[lowerKey]) {
          result[lowerKey] = { label: rawKey, value: 0, received: 0, count: 0 };
        }
        
        const cDate = new Date(l.created_at);
        const uDate = l.updated_at ? new Date(l.updated_at) : cDate;
        
        // Count Won Leads (by creation date) and accumulate their paid amount
        if ((!start || cDate >= start) && (!end || cDate <= end)) {
          const isClosed = stageNameToStatus(l.status) === 'closed' || 
                           (l.stage_id && pipelines[0]?.stages.find(s => s.id === l.stage_id && stageNameToStatus(s.name) === 'closed'));
          if (isClosed) {
            result[lowerKey].count += 1;
            result[lowerKey].value += getLeadEffectiveValue(l);
            result[lowerKey].received += financialCalculator.getPaidAmount(l, products);
          }
        }
      }
    });

    return Object.values(result).sort((a, b) => b.count - a.count);
  }, [leads, pipelines, startDate, endDate, filterProduct, filterResponsible, currentSellerName, products]);

  // Build seller goal map from goals (trim names to handle trailing spaces in DB)
  const sellerGoalMap = useMemo(() => {
    return goals.reduce(
      (acc: Record<string, { leads_goal: number; revenue_goal: number }>, g: any) => {
        const goalData = {
          leads_goal: g.leads_goal || 0,
          revenue_goal: g.revenue_goal || 0
        };
        if (g.seller_name) {
          acc[g.seller_name.trim()] = goalData;
        }
        if (g.seller_id) {
          acc[g.seller_id.trim()] = goalData;
        }
        return acc;
      },
      {}
    );
  }, [goals]);

  const allSellersRanking = useMemo(() => {
    const byName: Record<
      string,
      { label: string; value: number; received: number; count: number; percentage: number; leads_goal: number; profileId?: string }
    > = {};

    // Get individual goal IDs (type 'seller')
    const individualGoalIds = new Set(
      goals.filter(g => g.type === 'seller').map(g => g.seller_id).filter(Boolean)
    );
    const individualGoalNames = new Set(
      goals.filter(g => g.type === 'seller').map(g => g.seller_name?.trim()).filter(Boolean)
    );

    // 1. Add everyone who actually has sales
    salesByResponsible.forEach((s) => {
      const trimmedLabel = s.label.trim();
      if (!trimmedLabel) return;

      const profile = profiles.find(p => p.name?.trim() === trimmedLabel);

      // Only include if:
      // a) Is an official vendedor
      // b) Has an individual goal set
      const isOfficialVendedor = profile ? isVendedor(profile) : false;
      const hasIndividualGoal = individualGoalNames.has(trimmedLabel) || (profile && individualGoalIds.has(profile.id));

      if (isOfficialVendedor || hasIndividualGoal) {
        byName[trimmedLabel] = {
          ...s,
          label: trimmedLabel,
          percentage: 0,
          leads_goal: 0,
          profileId: profile?.id
        };
      }
    });

    // 2. Add all official vendedores (even if they have 0 sales)
    vendedorProfiles.forEach((p: any) => {
      const name = (p.name || '').trim();
      if (name && !byName[name]) {
        byName[name] = {
          label: name,
          value: 0,
          received: 0,
          count: 0,
          percentage: 0,
          leads_goal: 0,
          profileId: p.id
        };
      }
    });

    // 3. Calculate percentage and fetch goals
    Object.values(byName).forEach((s: any) => {
      const trimmedName = s.label.trim();
      const goal = sellerGoalMap[trimmedName] || (s.profileId ? sellerGoalMap[s.profileId] : null);

      s.leads_goal = goal?.leads_goal ?? 0;
      s.percentage =
        goal && goal.leads_goal > 0
          ? Math.round((s.count / goal.leads_goal) * 100)
          : 0;
    });

    // For any seller with 0% but positive count, show progress relative to top performer
    const maxCount = Math.max(...Object.values(byName).map((s: any) => s.count), 1);
    Object.values(byName).forEach((s: any) => {
      if (s.percentage === 0 && s.count > 0) {
        s.percentage = Math.round((s.count / maxCount) * 100);
      }
    });

    // Sort by count (quantity of sales) descending — competition ranking
    return Object.values(byName).sort(
      (a: any, b: any) => b.count - a.count || b.percentage - a.percentage
    ) as Array<{
      label: string;
      value: number;
      received: number;
      count: number;
      percentage: number;
      leads_goal: number;
    }>;
  }, [salesByResponsible, profiles, vendedorProfiles, goals, sellerGoalMap]);

  const otherSellersRanking = useMemo(() => {
    // Get individual goal IDs (type 'seller')
    const individualGoalIds = new Set(
      goals.filter(g => g.type === 'seller').map(g => g.seller_id).filter(Boolean)
    );
    const individualGoalNames = new Set(
      goals.filter(g => g.type === 'seller').map(g => g.seller_name?.trim()).filter(Boolean)
    );

    const others: Array<{ label: string; value: number; received: number; count: number }> = [];

    salesByResponsible.forEach((s) => {
      const trimmedLabel = s.label.trim();
      if (!trimmedLabel || s.count === 0) return;

      const profile = profiles.find(p => p.name?.trim() === trimmedLabel);
      const isOfficialVendedor = profile ? isVendedor(profile) : false;
      const hasIndividualGoal = individualGoalNames.has(trimmedLabel) || (profile && individualGoalIds.has(profile.id));

      if (!isOfficialVendedor && !hasIndividualGoal) {
        others.push({
          label: trimmedLabel,
          value: s.value,
          received: s.received,
          count: s.count
        });
      }
    });

    return others.sort((a, b) => b.count - a.count);
  }, [salesByResponsible, profiles, goals]);

  // Seller Semaphore data: received vs goal with color coding (Monetary based)
  const sellerSemaphoreData = useMemo(() => {
    const combinedSellers = [...allSellersRanking, ...otherSellersRanking];

    return combinedSellers.map((s: any) => {
      const goal = sellerGoalMap[s.label.trim()];
      const revGoal = goal?.revenue_goal ?? 0;
      
      // Calculate pct based on actual money received vs revenue goal
      let pct = 0;
      if (revGoal > 0) {
        pct = Math.round((s.received / revGoal) * 100);
      } else if (s.count > 0 || s.received > 0) {
        // If there's no goal but they made sales, show as 100% (Meta Atingida)
        pct = 100;
      }

      let color: 'red' | 'yellow' | 'green' | 'gold';
      let colorClass: string;
      let barColor: string;

      if (pct < 50) {
        color = 'red';
        colorClass = 'bg-red-50 text-red-700 border-red-200';
        barColor = '#ef4444';
      } else if (pct < 70) {
        color = 'yellow';
        colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
        barColor = '#f59e0b';
      } else if (pct <= 100) {
        color = 'green';
        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        barColor = '#10b981';
      } else {
        color = 'gold';
        colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
        barColor = '#fbbf24';
      }

      return { ...s, pct, color, colorClass, barColor, revenue_goal: revGoal };
    }).sort((a, b) => b.pct - a.pct);
  }, [allSellersRanking, otherSellersRanking, sellerGoalMap]);

  const EXCLUDED_STAGES = new Set(['Perdido', 'Desqualificado']);

  // Pipeline stages — uses real pipeline stages from DB when available, falls back to status groups
  const pipelineStages = useMemo(() => {
    const pipeline = pipelines[0];
    if (pipeline?.stages?.length) {
      const stageCountMap: Record<string, number> = {};
      filteredLeads.forEach((l: any) => {
        if (l.stage_id) {
          stageCountMap[l.stage_id] = (stageCountMap[l.stage_id] || 0) + 1;
        }
      });
      return [...pipeline.stages]
        .sort((a, b) => a.position - b.position)
        .filter(stage => !EXCLUDED_STAGES.has(stage.name))
        .map(stage => ({
          id: stage.id,
          label: stage.name,
          value: stageCountMap[stage.id] || 0,
          color: stage.color,
        }));
    }
    // Fallback: group by status when no real pipeline data
    return [
      { id: 'new', label: 'Novo', value: filteredLeads.filter((l: any) => stageNameToStatus(l.status) === 'new').length, color: 'hsl(210, 80%, 55%)' },
      { id: 'qualified', label: 'Qualificado', value: filteredLeads.filter((l: any) => stageNameToStatus(l.status) === 'qualified').length, color: 'hsl(142, 71%, 45%)' },
      { id: 'proposal', label: 'Proposta', value: filteredLeads.filter((l: any) => stageNameToStatus(l.status) === 'proposal').length, color: 'hsl(262, 80%, 55%)' },
      { id: 'closed', label: 'Fechado', value: closedLeadsCount, color: 'hsl(16, 85%, 55%)' },
    ];
  }, [pipelines, filteredLeads, closedLeadsCount]);

  const funnelStagesWithRates = useMemo(
    () => computeFunnelRates(pipelineStages),
    [pipelineStages]
  );

  const last6Months = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d.toLocaleString('pt-BR', { month: 'short' });
      }),
    []
  );

  const monthlySales = useMemo(
    () =>
      last6Months.map((label) => ({
        label,
        value: 0,
      })),
    [last6Months]
  );

  const avgMonthlyLeads =
    monthlySales.reduce((sum, m) => sum + m.value, 0) / monthlySales.length ||
    leads.length / 6;
  const avgTicket = totalSalesValue / closedLeadsCount || 1000;
  const avgFunnelRate = conversionRate;

  const predictiveData = useMemo(
    () => projectedRevenue(avgFunnelRate, avgMonthlyLeads, avgTicket),
    [avgFunnelRate, avgMonthlyLeads, avgTicket]
  );

  const trendData = useMemo(
    () => [...monthlySales.slice(-3), ...predictiveData],
    [monthlySales, predictiveData]
  );

  const totalPaidAttendees = useMemo(
    () =>
      turmas.reduce(
        (sum, t) =>
          sum +
          t.attendees.filter(
            (a) => a.status !== 'cancelado' && a.valor_recebido != null
          ).length,
        0
      ),
    [turmas]
  );

  const totalConversionRate =
    leads.length > 0 ? (totalPaidAttendees / leads.length) * 100 : 0;

  const attendeeStages = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    turmas.forEach((t) => {
      t.attendees.forEach((a) => {
        if (a.status !== 'cancelado') {
          statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        }
      });
    });
    return Object.entries(statusCounts).map(([label, value], i) => ({
      id: label,
      label,
      value,
      color:
        i === 0
          ? 'hsl(210, 80%, 55%)'
          : i === 1
            ? 'hsl(142, 71%, 45%)'
            : 'hsl(0, 84%, 60%)',
    }));
  }, [turmas]);

  const activeLeadsCount = useMemo(() => {
    const pipeline = pipelines[0];
    const stageMap = new Map(pipeline?.stages?.map(s => [s.id, s.name]) || []);
    const EXCLUDED_STAGES = new Set(['Perdido', 'Desqualificado']);

    return leads.filter((l: any) => {
      // 1. Basic Filters (Search, Product, Responsible)
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!l.name?.toLowerCase().includes(q) && !l.product?.toLowerCase().includes(q) && !l.responsible?.toLowerCase().includes(q)) return false;
      }
      if (filterProduct !== 'all' && l.product !== filterProduct) return false;
      if (filterResponsible !== 'all' && l.responsible !== filterResponsible) return false;
      if (currentSellerName && l.responsible !== currentSellerName) return false;

      // 2. Filter by Active Stages only
      const stageName = l.stage_id ? stageMap.get(l.stage_id) : l.status;
      if (!stageName) return true; // Include if no stage yet (new)
      
      const isExcluded = EXCLUDED_STAGES.has(stageName) || 
                         stageName.toLowerCase().includes('perdido') || 
                         stageName.toLowerCase().includes('desqualificado');
      
      return !isExcluded;
    }).length;
  }, [leads, searchTerm, filterProduct, filterResponsible, currentSellerName, pipelines]);

  return {
    totalGanhos,
    myGanhos,
    teamGanhos,
    leadsCount: filteredLeads.length,
    closedLeadsCount,
    conversionRate,
    averageSalesCycle,
    inactiveLeadsCount,
    totalSalesValue,
    occupancyData,
    vendedorProfiles,
    allSellersRanking,
    otherSellersRanking,
    sellerSemaphoreData,
    pipelineStages,
    funnelStagesWithRates,
    monthlySales,
    trendData,
    totalConversionRate,
    attendeeStages,
    availableProducts,
    availableResponsibles,
  };
}

