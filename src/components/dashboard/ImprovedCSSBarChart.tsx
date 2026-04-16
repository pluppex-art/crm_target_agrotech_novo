import React from 'react';
import { cn } from '../../lib/utils';
import { BarChart2 } from 'lucide-react';

interface ImprovedCSSBarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  gradient?: boolean;
  showValues?: boolean;
  emptyLabel?: string;
}

export function ImprovedCSSBarChart({ 
  data, 
  color = 'hsl(142, 71%, 45%)', 
  gradient = true,
  showValues = true,
  emptyLabel = 'Sem dados ainda' 
}: ImprovedCSSBarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const hasData = data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-44 p-8 text-slate-300 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <BarChart2 className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm font-semibold text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  const getBarColor = (index: number) => {
    const colors = [
      `${color.replace('500', '500')}`,
      `${color.replace('500', '400')}`,
      `${color.replace('500', '600')}`,
      `${color.replace('500', '300')}`
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="h-44 p-4 rounded-2xl border border-slate-100 shadow-sm bg-gradient-to-br from-white via-slate-50/50 to-slate-100/30 backdrop-blur-sm overflow-hidden">
      <div className="relative h-full flex items-end justify-between gap-1.5">
        {/* Grid background */}
        <div className="absolute inset-0 bg-grid-slate-100/20 [background-size:20px_20px] rounded-xl -z-10" />
        
        {/* Vertical grid lines */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((pos) => (
          <div
            key={pos}
            className="w-px bg-gradient-to-t from-slate-200/60 to-transparent h-full absolute"
            style={{ left: `${pos * 100}%` }}
          />
        ))}

        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div 
              key={`${d.label}-${i}`}
              className="group flex flex-col items-center flex-1 h-full relative z-10 hover:scale-[1.05] transition-all duration-200"
            >
              {/* Value label */}
              {showValues && (
                <span 
                  className={cn(
                    "text-xs font-bold absolute -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-slate-100/50 text-slate-700 transition-opacity",
                    pct > 10 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}
                  style={{ bottom: `${pct + 2}%`, left: '50%' }}
                >
                  {d.value >= 10000 ? `${(d.value/1000).toFixed(0)}k` : d.value.toLocaleString()}
                </span>
              )}
              
              {/* Enhanced bar */}
              <div 
                className={cn(
                  'relative w-4/5 rounded-2xl shadow-lg overflow-hidden transition-all duration-700 ease-out group-hover:shadow-xl hover:-rotate-[2deg]',
                  gradient ? 'bg-gradient-to-t' : ''
                )}
                style={{ 
                  height: `${Math.max(pct, 3)}%`,
                  background: gradient 
                    ? `linear-gradient(to top, ${getBarColor(i)}, ${getBarColor(i).replace(/500$|400$/, '300')})` 
                    : color
                }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform -translate-x-1/2 opacity-75" />
                
                {/* Sparkle on hover */}
                <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Label */}
              <span 
                className="text-[10px] font-bold text-slate-600 mt-1.5 px-1 py-px bg-slate-100/50 rounded-md backdrop-blur-sm group-hover:bg-slate-200 transition-colors"
                title={d.label}
              >
                {d.label.length > 4 ? d.label.slice(0,4) + '.' : d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

