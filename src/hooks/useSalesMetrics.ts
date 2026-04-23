import { useMemo } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { useTurmaStore } from '../store/useTurmaStore';
import { useProfileStore } from '../store/useProfileStore';
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
    count: number;
    percentage: number;
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
}

interface UseSalesMetricsProps {
  currentSellerName?: string | null;
  startDate?: string;
  endDate?: string;
  goals?: Array<{ seller_id?: string; seller_name?: string; revenue_goal?: number }>;
}

export function useSalesMetrics({
  currentSellerName,
  startDate,
  endDate,
  goals = [],
}: UseSalesMetricsProps): SalesMetrics {
  const { leads } = useLeadStore();
  const { turmas } = useTurmaStore();
  const { profiles } = useProfileStore();
  const vendedorProfiles = useMemo(() => profiles.filter(isVendedor), [profiles]);

  const totalGanhos = getSellerIncome(turmas, '', startDate, endDate);
  const myGanhos = currentSellerName
    ? getSellerIncome(turmas, currentSellerName, startDate, endDate)
    : 0;
  const teamGanhos = totalGanhos - myGanhos;

  const closedLeadsFiltered = leads.filter(
    (l: any) => l.status === 'closed' || stageNameToStatus(l.status) === 'closed'
  );
  const closedLeadsCount = closedLeadsFiltered.length;

  const conversionRate =
    leads.length > 0 ? (closedLeadsCount / leads.length) * 100 : 0;

  const totalSalesValue = closedLeadsFiltered.reduce(
    (s: number, l: any) => s + getLeadEffectiveValue(l),
    0
  );

  const occupancyData = getOccupancyData(turmas);

  // Seller ranking based on turma attendees (same source as getSellerIncome)
  const salesByResponsible = useMemo(() => {
    const result: Record<string, { label: string; value: number; count: number }> = {};
    turmas.forEach(t => {
      t.attendees
        .filter((a: any) => a.status !== 'cancelado' && a.responsible)
        .forEach((a: any) => {
          const key = a.responsible as string;
          result[key] = result[key] || { label: key, value: 0, count: 0 };
          result[key].value += a.valor_recebido || 0;
          result[key].count += 1;
        });
    });
    return Object.values(result).sort(
      (a, b) => b.count - a.count
    );
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
      { label: string; value: number; count: number; percentage: number }
    > = {};

    // Add vendedores with sales
    vendedorSales.forEach((s) => {
      byName[s.label] = { ...s, percentage: 0 };
    });

    // Ensure ALL vendedores appear (even with 0 sales)
    vendedorProfiles.forEach((p: any) => {
      const name = p.name!;
      if (!byName[name]) {
        byName[name] = { label: name, value: 0, count: 0, percentage: 0 };
      }
    });

    // Calculate percentage based on goals
    // Use revenue/revenue_goal when revenue > 0, otherwise count/leads_goal
    Object.values(byName).forEach((s: any) => {
      const goal = sellerGoalMap[s.label.trim()];
      if (goal) {
        if (s.value > 0 && goal.revenue_goal > 0) {
          s.percentage = Math.round((s.value / goal.revenue_goal) * 100);
        } else if (s.count > 0 && goal.leads_goal > 0) {
          s.percentage = Math.round((s.count / goal.leads_goal) * 100);
        } else {
          s.percentage = 0;
        }
      } else {
        s.percentage = 0;
      }
    });

    // Fallback: if no seller has a goal set, rank relative to top performer by count
    const hasGoals = Object.values(byName).some((s: any) => s.percentage > 0);
    if (!hasGoals) {
      const maxCount = Math.max(...Object.values(byName).map((s: any) => s.count), 1);
      Object.values(byName).forEach((s: any) => {
        s.percentage = Math.round((s.count / maxCount) * 100);
      });
    }

    return Object.values(byName).sort(
      (a: any, b: any) => b.percentage - a.percentage || b.count - a.count
    ) as Array<{
      label: string;
      value: number;
      count: number;
      percentage: number;
    }>;
  }, [salesByResponsible, vendedorProfiles, sellerGoalMap]);

  // Pipeline stages
  const pipelineStages = [
    {
      id: 'new',
      label: 'Novo',
      value: leads.filter((l: any) => stageNameToStatus(l.status) === 'new')
        .length,
      color: 'hsl(210, 80%, 55%)',
    },
    {
      id: 'qualified',
      label: 'Qualificado',
      value: leads.filter(
        (l: any) => stageNameToStatus(l.status) === 'qualified'
      ).length,
      color: 'hsl(142, 71%, 45%)',
    },
    {
      id: 'proposal',
      label: 'Proposta',
      value: leads.filter(
        (l: any) => stageNameToStatus(l.status) === 'proposal'
      ).length,
      color: 'hsl(262, 80%, 55%)',
    },
    {
      id: 'closed',
      label: 'Fechado',
      value: closedLeadsCount,
      color: 'hsl(0, 84%, 60%)',
    },
  ];

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
    leadsCount: leads.length,
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
  };
}
