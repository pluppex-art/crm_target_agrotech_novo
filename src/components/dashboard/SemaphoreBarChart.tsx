import React from 'react';
import { BarChart2 } from 'lucide-react';

interface BarItem {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}

interface SemaphoreBarChartProps {
  data: BarItem[];
  color?: string;
  showValues?: boolean;
  emptyLabel?: string;
  minBarWidth?: number;
  chartHeight?: number;
}

export function SemaphoreBarChart({
  data,
  color = '#3b82f6',
  showValues = true,
  emptyLabel = 'Sem dados ainda',
  minBarWidth = 60,
  chartHeight = 180,
}: SemaphoreBarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <div
        className="flex flex-col items-center justify-center text-slate-300 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
        style={{ height: chartHeight + 60 }}
      >
        <BarChart2 className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm font-semibold text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k`
    : String(n);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar pb-2">
      <div className="flex items-end justify-around gap-4 min-w-full px-2" style={{ height: chartHeight + 40 }}>
        {data.map((d, i) => {
          const percentage = (d.value / max) * 100;
          const barHeight = Math.max(percentage * 0.8, d.value > 0 ? 5 : 0);
          const barColor = d.color ?? color;

          return (
            <div
              key={`bar-${i}`}
              className="flex flex-col items-center justify-end h-full group"
              style={{ minWidth: minBarWidth, flex: '1 1 0' }}
            >
              {/* Value Indicator */}
              {showValues && (
                <div className="mb-2 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 opacity-80 group-hover:opacity-100">
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm whitespace-nowrap">
                    {d.sublabel ?? fmt(d.value)}
                  </span>
                </div>
              )}

              {/* Bar Container */}
              <div className="relative w-full flex flex-col items-center">
                {/* Main Bar */}
                <div
                  className="w-full max-w-[40px] rounded-t-2xl transition-all duration-500 ease-out group-hover:scale-x-110 group-hover:brightness-110 relative"
                  style={{
                    height: `${barHeight}%`,
                    background: `linear-gradient(to top, ${barColor}, ${barColor}dd)`,
                    boxShadow: barHeight > 0 ? `0 4px 12px ${barColor}33` : 'none',
                  }}
                >
                  {/* Glass highlight */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-white dark:bg-slate-900/10 rounded-t-2xl" />
                </div>
                
                {/* Empty State / Floor */}
                <div className="w-full max-w-[40px] h-[2px] bg-slate-100 dark:bg-slate-800/50 rounded-full" />
              </div>

              {/* Label */}
              <div className="mt-3 text-center w-full px-1">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate uppercase tracking-tight group-hover:text-slate-800 dark:text-slate-200 transition-colors" title={d.label}>
                  {d.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Decorative Baseline */}
      <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800/50 mt-1" />
    </div>
  );
}
