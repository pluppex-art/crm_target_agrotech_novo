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
  const C = 2 * Math.PI * R;

  let cumAngle = 0;
  const segments = data.map(d => {
    const pct = d.value / total;
    const startAngle = cumAngle;
    cumAngle += pct * 360;
    return { ...d, pct, startAngle };
  });

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex flex-col items-center w-full gap-4">
      {/* Donut ring — centered */}
      <div className="relative w-48 h-48 flex-shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full">
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="hsl(210 40% 94%)"
            strokeWidth={SW}
          />
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

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-20 h-20 bg-white/90 rounded-2xl border-2 border-white/60 shadow-xl flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-slate-800">{total}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              {totalLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Legend — aligned below, all stages visible, two columns when many */}
      <div className="w-full grid grid-cols-1 gap-2">
        {data.map(d => {
          const pct = Math.round((d.value / total) * 100);
          const barW = Math.min(100, Math.round((d.value / maxValue) * 100));
          return (
            <div key={d.label} className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span
                  className="text-xs font-medium text-slate-600 truncate flex-1 leading-tight"
                  title={d.label}
                >
                  {d.label}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs font-bold text-slate-700 tabular-nums">{d.value}</span>
                  <span className="text-[10px] text-slate-400 tabular-nums">({pct}%)</span>
                </div>
              </div>
              {/* Proportion bar */}
              <div className="ml-4 mr-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barW}%`, backgroundColor: d.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
