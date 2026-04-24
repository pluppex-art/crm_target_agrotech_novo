import { MetricCard } from './MetricCard';
import { Users, TrendingUp } from 'lucide-react';
import { fmt } from '../../lib/utils';
import type { SalesMetrics } from '../../hooks/useSalesMetrics';

interface SalesOverviewProps {
  sales: SalesMetrics;
  currentSellerName?: string | null;
  isLoading: boolean;
}

export function SalesOverview({ sales, currentSellerName, isLoading }: SalesOverviewProps) {
  if (isLoading) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      <MetricCard label="Leads Ativos" value={String(sales.leadsCount)} icon={Users} color="bg-emerald-50 text-emerald-600" />
      <MetricCard label="Ganhos Totais" value={`R$ ${fmt(sales.totalGanhos)}`} icon={Users} color="bg-emerald-50 text-emerald-600" />
      {currentSellerName ? (
        <>
          <MetricCard label="Meus Ganhos" value={`R$ ${fmt(sales.myGanhos)}`} icon={TrendingUp} color="bg-blue-50 text-blue-600" />
          <MetricCard label="Equipe" value={`R$ ${fmt(sales.teamGanhos)}`} icon={Users} color="bg-purple-50 text-purple-600" />
        </>
      ) : (
        <MetricCard label="Conversão" value={`${sales.conversionRate.toFixed(1)}%`} icon={Users} color="bg-purple-50 text-purple-600" />
      )}
      <MetricCard label="Em Proposta" value={String(sales.pipelineStages.find(s => s.label === 'Proposta')?.value || 0)} icon={Users} color="bg-rose-50 text-rose-600" />
    </div>
  );
}
