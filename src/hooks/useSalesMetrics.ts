import { useMemo } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { useTurmaStore } from '../store/useTurmaStore';
import { useProfileStore } from '../store/useProfileStore';
import { usePipelineStore } from '../store/usePipelineStore';
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
  totalSalesValue: number;
  occupancyData: ReturnType<typeof getOccupancyData>;
  vendedorProfiles: any[];
  allSellersRanking: Array<{
    label: string;
    value: number;
    received: number;
    count: number;
    percentage: number;
    revenue_goal: number;
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
  goals?: Array<{ seller_id?: string; seller_name?: string; revenue_goal?: number }>;
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
    return result;
  }, [leads, searchTerm, filterStage, filterProduct, filterResponsible]);

  const totalGanhos = getSellerIncome(turmas, '', startDate, endDate);
  const myGanhos = currentSellerName
    ? getSellerIncome(turmas, currentSellerName, startDate, endDate)
    : 0;
  const teamGanhos = totalGanhos - myGanhos;

  const closedLeadsFiltered = filteredLeads.filter(
    (l: any) => l.status === 'closed' || stageNameToStatus(l.status) === 'closed'
  );
  const closedLeadsCount = closedLeadsFiltered.length;

  const conversionRate =
    filteredLeads.length > 0 ? (closedLeadsCount / filteredLeads.length) * 100 : 0;

  const totalSalesValue = closedLeadsFiltered.reduce(
    (s: number, l: any) => s + getLeadEffectiveValue(l),
    0
  );

  const occupancyData = getOccupancyData(turmas);

  // Seller ranking: uses `vendas` (committed sale value) for progress vs goal
  // `valor_recebido` is only for actual cash received (Ganhos Totais card)
  const salesByResponsible = useMemo(() => {
    const result: Record<string, { label: string; value: number; received: number; count: number }> = {};
    turmas.forEach(t => {
      t.attendees
        .filter((a: any) => a.status !== 'cancelado' && a.responsible)
        .forEach((a: any) => {
          const key = a.responsible as string;
          result[key] = result[key] || { label: key, value: 0, received: 0, count: 0 };
          result[key].value += (a.vendas || a.valor_recebido || 0);
          result[key].received += (a.valor_recebido || 0);
          result[key].count += 1;
        });
    });
    return Object.values(result).sort((a, b) => b.count - a.count);
  }, [turmas]);

  // Build seller goal map from goals (trim names to handle trailing spaces in DB)
  const sellerGoalMap = useMemo(() => {
    return goals.reduce(
      (acc: Record<string, { revenue_goal: number; leads_goal: number }>, g: any) => {
        const key = (g.seller_name || g.seller_id || '').trim();
        if (key) {
          acc[key] = {
            revenue_goal: g.revenue_goal || 0,
            leads_goal: g.leads_goal || 0,
          };
        }
        return acc;
      },
      {}
    );
  }, [goals]);

  const allSellersRanking = useMemo(() => {
    // Get names of all vendedores
    const vendedorNames = new Set(
      vendedorProfiles.map((p: any) => p.name).filter(Boolean)
    );

    // Filter sales to only include actual vendedores
    const vendedorSales = salesByResponsible.filter((s) =>
      vendedorNames.has(s.label)
    );

    const byName: Record<
      string,
      { label: string; value: number; received: number; count: number; percentage: number; revenue_goal: number }
    > = {};

    // Add vendedores with sales
    vendedorSales.forEach((s) => {
      byName[s.label] = { ...s, percentage: 0, revenue_goal: 0 };
    });

    // Ensure ALL vendedores appear (even with 0 sales)
    vendedorProfiles.forEach((p: any) => {
      const name = p.name!;
      if (!byName[name]) {
        byName[name] = { label: name, value: 0, received: 0, count: 0, percentage: 0, revenue_goal: 0 };
      }
    });

    // Calculate percentage: valor_recebido (pago) vs revenue goal
    Object.values(byName).forEach((s: any) => {
      const goal = sellerGoalMap[s.label.trim()];
      s.revenue_goal = goal?.revenue_goal ?? 0;
      s.percentage =
        goal && goal.revenue_goal > 0
          ? Math.round((s.received / goal.revenue_goal) * 100)
          : 0;
    });

    // For any seller with 0% but positive count, show progress relative to top performer
    const maxCount = Math.max(...Object.values(byName).map((s: any) => s.count), 1);
    Object.values(byName).forEach((s: any) => {
      if (s.percentage === 0 && s.count > 0) {
        s.percentage = Math.round((s.count / maxCount) * 100);
      }
    });

    return Object.values(byName).sort(
      (a: any, b: any) => b.percentage - a.percentage || b.count - a.count
    ) as Array<{
      label: string;
      value: number;
      received: number;
      count: number;
      percentage: number;
      revenue_goal: number;
    }>;
  }, [salesByResponsible, vendedorProfiles, sellerGoalMap]);

  const EXCLUDED_STAGES = new Set(['Perdido', 'Aquecimento', 'Desqualificado']);

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

  return {
    totalGanhos,
    myGanhos,
    teamGanhos,
    leadsCount: filteredLeads.length,
    closedLeadsCount,
    conversionRate,
    totalSalesValue,
    occupancyData,
    vendedorProfiles,
    allSellersRanking,
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
