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

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
        <h3 className="font-bold text-xl text-slate-800 mb-6">Funil de Conversão</h3>
        <FunnelChart
          stages={sales.funnelStagesWithRates.map((s, i) => ({
            label: `${s.label} (${s.rate_from_prev ?? 0}%)`,
            count: s.value,
            color: s.color,
            icon: i === 0 ? Users : i === sales.funnelStagesWithRates.length - 1 ? CheckCircle2 : i % 3 === 1 ? Filter : FileText
          }))}
          conversionRate={sales.totalConversionRate}
        />
      </div>
    </div>
  );
}

