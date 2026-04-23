import { MetricCard } from './MetricCard';
import { ImprovedCSSBarChart } from './ImprovedCSSBarChart';
import { HorizontalBar } from './HorizontalBar';
import { Users, TrendingUp } from 'lucide-react';
import { fmt } from '../../lib/utils';
import type { SalesMetrics } from '../../hooks/useSalesMetrics';

interface SalesOverviewProps {
  sales: SalesMetrics;
  currentSellerName?: string | null;
  isLoading: boolean;
}

export function SalesOverview({ sales, currentSellerName, isLoading }: SalesOverviewProps) {
  if (isLoading) {
    return <div>Loading sales...</div>; // Add skeleton
  }

  return (
    <>
      {/* Sales metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
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

      {/* Ranking + Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Ranking de Vendedores (% Meta)</h3>
          {sales.allSellersRanking.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-300">
              <Users className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-medium">Sem vendedores cadastrados</p>
            </div>
          ) : (
            <div className="space-y-5 flex-1">
              {sales.allSellersRanking.slice(0, 7).map((s, i) => (
                <HorizontalBar
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  received={s.received}
                  max={s.revenue_goal}
                  rank={i}
                  count={s.count}
                  color={i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-purple-400' : 'bg-slate-300'}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4">Taxa de Ocupação</h3>
          <div className="flex-1 flex flex-col justify-end min-h-[220px]">
            <ImprovedCSSBarChart
              data={sales.occupancyData.slice(0, 6).map((d: { name: any; alunos: any; capacity: any; pct: any; }) => ({ label: `${d.name} (${d.alunos}/${d.capacity})`, value: d.pct }))}
              color="hsl(142, 71%, 45%)"
              gradient
              showValues
            />
          </div>
        </div>
      </div>
    </>
  );
}

