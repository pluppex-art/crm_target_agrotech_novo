import { LineTrendChart } from './LineTrendChart';
import { GoalRing } from './GoalRing';
import { FunnelChart } from './FunnelChart';
import { Users, CheckCircle2, Filter } from 'lucide-react';
import type { SalesMetrics } from '../../hooks/useSalesMetrics';
import { fmt } from '../../lib/utils';

interface TrendsSectionProps {
  sales: SalesMetrics;
  totalIncome: number;
  totalSalesGoal: number;
}

export function TrendsSection({ sales, totalIncome, totalSalesGoal }: TrendsSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
          <h3 className="font-bold text-xl text-slate-800 mb-6">Tendência de Vendas</h3>
          <LineTrendChart 
            data={sales.trendData} 
            color="hsl(142, 71%, 45%)" 
            trend="up"
            suffix="k"
          />
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
          <h3 className="font-bold text-xl text-slate-800 mb-6">Pipeline Turmas</h3>
          <FunnelChart
            stages={sales.attendeeStages.map((s, i) => ({
              label: s.label,
              count: s.value,
              color: s.color,
              icon: i === 0 ? Users : i === sales.attendeeStages.length - 1 ? CheckCircle2 : Filter
            }))}
            conversionRate={sales.totalConversionRate}
          />
        </div>
      </div>

      {/* Progresso da Meta Geral */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
        <h3 className="font-bold text-xl text-slate-800 mb-6">Progresso da Meta Geral</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-500 mb-2">Pago vs Meta</p>
            <LineTrendChart 
              data={sales.monthlySales} 
              color="hsl(142, 71%, 45%)" 
              trend="up"
              suffix=""
            />
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-2">
              Meta Mensal R$ {fmt(Math.round(totalSalesGoal / 6))}
            </p>
            <div className="h-32 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl flex items-center justify-center">
              <GoalRing 
                current={totalIncome} 
                target={totalSalesGoal} 
                label="Total" 
                color="hsl(142, 71%, 45%)"
                size="md"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

