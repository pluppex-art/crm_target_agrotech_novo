import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface LineTrendChartProps {
  data: Array<{ label: string; value: number }>;
  color?: string;
  trend?: 'up' | 'down';
  emptyLabel?: string;
  suffix?: string;
}

export function LineTrendChart({ 
  data, 
  color = 'hsl(142, 71%, 45%)', 
  trend = 'up',
  emptyLabel = 'Sem dados para tendência',
  suffix = ''
}: LineTrendChartProps) {
  const hasData = data.some(d => d.value > 0);
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 p-8 text-slate-300 rounded-2xl border-2 border-dashed border-slate-200">
        <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));

  return (
    <div className="h-48 p-4 bg-gradient-to-b from-slate-50/50 to-slate-100/50 rounded-2xl border border-slate-100">
      <div className="relative h-full flex items-end justify-between gap-1">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((level, i) => (
          <div
            key={`grid-${i}`}
            className="absolute left-0 right-0 h-px bg-slate-200"
            style={{ bottom: `${level * 100}%` }}
          />
        ))}

        {/* Data points and line */}
        {data.map((d, i) => {
          const pct = max > 0 ? ((d.value - min) / (max - min)) * 100 : 50;
          return (
            <div
              key={d.label}
              className="flex flex-col items-center flex-1 relative z-10"
              style={{ '--i': i } as React.CSSProperties }
            >
              {/* Value label */}
              <span
                className="text-xs font-bold text-slate-600 mb-2 -translate-y-3"
                style={{ bottom: `${pct}%` }}
              >
                {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}{suffix}
              </span>
              
              {/* Data point */}
              <div
                className={cn(
                  'w-3 h-3 rounded-full shadow-lg border-2 transition-all duration-500',
                  color === 'hsl(142, 71%, 45%)' ? 'bg-emerald-400 border-emerald-500' : 'bg-rose-400 border-rose-500'
                )}
                style={{ bottom: `${pct}%`, transitionDelay: `${i * 100}ms` }}
              />

              {/* Bar for volume */}
              <div
                className={cn('w-full rounded-t-full opacity-30 transition-all duration-500', color)}
                style={{ 
                  height: `${Math.max(pct * 0.6, 2)}%`,
                  transitionDelay: `${i * 150}ms`
                }}
              />
            </div>
          );
        })}

        {/* Connecting line */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ bottom: '0' }}
        >
          <polyline
            points={data.map((_, i) => `${(i / (data.length - 1)) * 100}, ${100 - (Math.max(...data.map(d => d.value)) > 0 ? ((data[i].value - min) / (max - min)) * 100 : 50)}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-[3] animate-draw-path"
          />
        </svg>

        {/* Trend indicator */}
        <div className="absolute -top-10 right-4 flex items-center gap-1 p-2 bg-white/90 backdrop-blur-sm rounded-xl border shadow-lg">
          <span className={cn('w-3 h-3 rounded-full', trend === 'up' ? 'bg-emerald-500' : 'bg-rose-500')} />
          <span className="text-xs font-bold">
            {trend === 'up' ? '↗️ Crescendo' : '↘️ Caindo'}
          </span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-3 px-2">
        {data.map((d, i) => (
          <span
            key={d.label}
            className="text-[11px] text-slate-400 font-medium w-12 truncate text-center"
            title={d.label}
          >
            {d.label.length > 3 ? d.label.slice(0,3) + '.' : d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

