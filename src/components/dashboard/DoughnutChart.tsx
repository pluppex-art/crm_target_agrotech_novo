import React from 'react';
import { Users } from 'lucide-react';

interface DoughnutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  totalLabel?: string;
  emptyLabel?: string;
}

export function DoughnutChart({
  data,
  totalLabel = 'Total',
  emptyLabel = 'Sem dados para distribuição',
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

  const SIZE = 200;
  const CX = 100;
  const CY = 100;
  const R = 72;
  const SW = 24;
  const C = 2 * Math.PI * R; // circumference ≈ 452

  // Build segments with cumulative start angles (degrees)
  let cumAngle = 0;
  const segments = data.map(d => {
    const pct = d.value / total;
    const startAngle = cumAngle;
    cumAngle += pct * 360;
    return { ...d, pct, startAngle };
  });

  return (
    <div className="p-4">
      {/* SVG Doughnut */}
      <div className="relative mx-auto w-48 h-48">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full">
          {/* Background ring */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="hsl(210 40% 94%)"
            strokeWidth={SW}
          />

          {/* Segments — each rotated to its cumulative start angle.
              strokeDasharray shows exactly pct of the arc;
              strokeDashoffset=C/4 shifts the dash start to 12 o'clock
              (SVG paths start at 3 o'clock; C/4 = 90° shift) */}
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={SW}
              strokeLinecap="butt"
              strokeDasharray={`${seg.pct * C} ${C}`}
              strokeDashoffset={C / 4}
              transform={`rotate(${seg.startAngle} ${CX} ${CY})`}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-20 h-20 bg-white/90 rounded-2xl border-2 border-white/60 shadow-xl flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-slate-800">{total}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              {totalLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 space-y-2">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-sm font-medium text-slate-700 truncate flex-1">{d.label}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs font-bold text-slate-700">{d.value}</span>
              <span className="text-xs text-slate-400">
                ({Math.round((d.value / total) * 100)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
