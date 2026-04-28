import { DoughnutChart } from './DoughnutChart';
import { FunnelChart } from './FunnelChart';
import { Users, CheckCircle2, Filter, FileText } from 'lucide-react';
import type { SalesMetrics } from '../../hooks/useSalesMetrics';

interface PipelineFunnelProps {
  sales: SalesMetrics;
}

export function PipelineFunnel({ sales }: PipelineFunnelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
        <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Distribuição do Pipeline
        </h3>
        <DoughnutChart 
          data={sales.pipelineStages.map(s => ({ label: s.label, value: s.value, color: s.color }))} 
          totalLabel="Leads" 
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 flex flex-col relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl text-slate-800">Funil de Conversão</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg shadow-sm">
              <Users className="w-4 h-4 text-emerald-50" />
              <span className="text-sm font-bold">
                {sales.activeLeadsCount} Ativos
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-50" />
              <span className="text-sm font-bold">
                {sales.totalConversionRate.toFixed(1)}% Conv.
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <FunnelChart
            stages={sales.funnelStagesWithRates.map((s, i) => ({
              label: s.label,
              count: s.value,
              color: s.color,
              icon: i === 0 ? Users : i === sales.funnelStagesWithRates.length - 1 ? CheckCircle2 : i % 3 === 1 ? Filter : FileText
            }))}
          />
        </div>
      </div>
    </div>
  );
}

