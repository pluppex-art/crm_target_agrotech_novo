import { CheckCircle, TrendingDown, Users } from 'lucide-react';

interface FunnelStageItem {
  label: string;
  count: number;
  color: string;
}

interface FunnelChartProps {
  stages: FunnelStageItem[];
  conversionRate?: number;
  activeLeadsCount?: number;
  emptyLabel?: string;
}

export function FunnelChart({
  stages,
  conversionRate,
  activeLeadsCount,
  emptyLabel = 'Sem dados de pipeline',
}: FunnelChartProps) {
  const hasData = stages.some(s => s.count > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-56 p-8 text-slate-300 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100">
        <TrendingDown className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-base font-medium text-slate-400 mb-1">{emptyLabel}</p>
        <p className="text-sm text-slate-400">Acompanhe leads em cada etapa</p>
      </div>
    );
  }

  // Taper purely by index so it always looks like a funnel
  const minWidthPct = 52;
  const step = stages.length > 1 ? (100 - minWidthPct) / (stages.length - 1) : 0;

  const totalLeads = stages[0]?.count || 1;

  return (
    <div className="flex flex-col gap-0 overflow-hidden">
      {stages.map((stage, i) => {
        const widthPct = Math.round(100 - i * step);
        const prev = i > 0 ? stages[i - 1] : null;

        // Calculate the ratio between the current stage and the previous stage
        const convFromPrev =
          prev && prev.count > 0
            ? Math.round((stage.count / prev.count) * 100)
            : null;

        const pctOfFirst =
          totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;

        return (
          <div key={`${stage.label}-${i}`} className="flex flex-col items-center w-full">
            {/* Arrow between stages */}
            {i > 0 && (
              <div className="flex items-center gap-1 py-0.5 text-[10px] font-semibold text-slate-400">
                {convFromPrev !== null ? (
                  <>
                    <span className="text-slate-300">↓</span>
                    <span>{convFromPrev}% avançaram</span>
                  </>
                ) : (
                  <span className="text-slate-200">↓</span>
                )}
              </div>
            )}

            {/* Stage bar — width capped at 100% of widthPct */}
            <div
              className="relative flex items-center justify-between px-3 py-2.5 rounded-xl overflow-hidden transition-all duration-300 hover:brightness-105 cursor-default"
              style={{
                width: `${widthPct}%`,
                backgroundColor: stage.color,
              }}
              title={`${stage.label}: ${stage.count} leads`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

              <span className="text-xs font-semibold text-white truncate relative z-10 leading-tight">
                {stage.label}
              </span>

              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2 relative z-10">
                <span className="text-sm font-bold text-white tabular-nums">
                  {stage.count}
                </span>
                {i > 0 && pctOfFirst < 100 && (
                  <span className="text-[10px] text-white/65 font-medium">
                    ({pctOfFirst}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {conversionRate !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 py-2.5 bg-emerald-50/70 rounded-2xl">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-bold text-emerald-700">
            Conversão total: {conversionRate.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
