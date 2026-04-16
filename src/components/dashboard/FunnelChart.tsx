import React from 'react';
import { Users, CheckCircle } from 'lucide-react';

interface FunnelChartProps {
  stages: Array<{
    label: string;
    count: number;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  conversionRate?: number;
  emptyLabel?: string;
}

export function FunnelChart({
  stages,
  conversionRate,
  emptyLabel = 'Sem dados de pipeline',
}: FunnelChartProps) {
  const hasData = stages.some(s => s.count > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-56 p-8 text-slate-300 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100">
        <Users className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-base font-medium text-slate-400 mb-1">{emptyLabel}</p>
        <p className="text-sm text-slate-400">Acompanhe leads em cada etapa</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const Icon = stage.icon;
        // Dynamically shrink so last stage reaches ~55% width regardless of stage count
        const minWidth = 55;
        const step = stages.length > 1 ? (100 - minWidth) / (stages.length - 1) : 0;
        const widthPct = 100 - i * step;
        const dropPct =
          i > 0 && stages[i - 1].count > 0
            ? Math.round(
                ((stages[i - 1].count - stage.count) / stages[i - 1].count) * 100
              )
            : null;

        return (
          <div key={stage.label} className="flex flex-col items-center">
            {dropPct !== null && (
              <div className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <span>↓</span>
                <span>{dropPct}% queda</span>
              </div>
            )}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl transition-opacity hover:opacity-90"
              style={{ width: `${widthPct}%`, backgroundColor: stage.color }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="w-4 h-4 text-white/90 flex-shrink-0" />
                <span className="text-sm font-semibold text-white truncate">
                  {stage.label}
                </span>
              </div>
              <span className="text-sm font-bold text-white flex-shrink-0 ml-2">
                {stage.count}
              </span>
            </div>
          </div>
        );
      })}

      {conversionRate !== undefined && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 p-3 bg-emerald-50/60 rounded-2xl">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">
            Taxa de conversão: {conversionRate.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
