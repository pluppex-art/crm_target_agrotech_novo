import React from 'react';
import { cn } from '../../lib/utils';
import { Users, BarChart2 } from 'lucide-react';

interface DoughnutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  totalLabel?: string;
  emptyLabel?: string;
}

export function DoughnutChart({ 
  data, 
  totalLabel = 'Total', 
  emptyLabel = 'Sem dados para distribuição'
}: DoughnutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const hasData = total > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 p-8 text-slate-300 rounded-2xl border-2 border-dashed border-slate-200">
        <Users className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  const radius = 60;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const centerRadius = radius - strokeWidth;

  const segments = data.map((d, index) => ({
    ...d,
    pct: total > 0 ? d.value / total : 0,
    startAngle: data.slice(0, index).reduce((sum, item) => sum + (item.value / total), 0) * 360,
    endAngle: data.slice(0, index + 1).reduce((sum, item) => sum + (item.value / total), 0) * 360
  }));

  return (
    <div className="p-6">
      {/* SVG Doughnut */}
      <div className="relative mx-auto w-48 h-48">
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90 transform origin-center">
          <circle
            cx="50%"
            cy="50%"
            r={`${radius}%`}
            fill="none"
            stroke="hsl(210 40% 96%)"
            strokeWidth={strokeWidth}
          />
        </svg>

        {/* Segments */}
        {segments.map((seg, i) => (
          <svg
            key={seg.label}
            className="w-full h-full absolute -rotate-90 transform origin-center"
            style={{ zIndex: i }}
          >
            <circle
              cx="50%"
              cy="50%"
              r={`${radius}%`}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={`${circumference * (1 - seg.pct)}`}
              className="transition-all duration-1000"
              style={{
                strokeDashoffset: `${circumference * (1 - seg.pct)}`,
                transitionDelay: `${i * 100}ms`
              }}
            />
          </svg>
        ))}

        {/* Center hole + total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white/50 shadow-xl flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-slate-800">{total}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">{totalLabel}</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 space-y-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-3">
            <div 
              className={cn('w-3 h-3 rounded-full', d.color)} 
              style={{ boxShadow: `0 0 0 2px white, 0 0 0 4px ${d.color.replace('500', '400')}` }}
            />
            <span className="text-sm font-medium text-slate-700">{d.label}</span>
            <span className="ml-auto text-xs text-slate-500">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

