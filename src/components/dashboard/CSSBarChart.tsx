import React from 'react';
import { BarChart2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CSSBarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  emptyLabel?: string;
}

export function CSSBarChart({ data, color = 'bg-emerald-500', emptyLabel = 'Sem dados ainda' }: CSSBarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const hasData = data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-300">
        <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-xs font-medium">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 h-40 w-full">
      {data.map((d, i) => {
        const pct = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={`${d.label}-${i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <span className="text-[9px] font-bold text-slate-500">
              {d.value > 0 ? (d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value) : ''}
            </span>
            <div
              className={cn('w-full rounded-t-md transition-all', color)}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

