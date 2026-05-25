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
      <div className="flex flex-col items-center justify-center h-56 p-8 text-slate-300 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <Users className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{emptyLabel}</p>
      </div>
    );
  }

  const SIZE = 200;
  const CX = 100;
  const CY = 100;
  const R = 75;
  const SW = 18;
  const C = 2 * Math.PI * R;

  let cumAngle = 0;
  const segments = data.map(d => {
    const pct = d.value / total;
    const startAngle = cumAngle;
    cumAngle += pct * 360;
    // Add small gap between segments
    const dashValue = Math.max(0, (pct * C) - 2); 
    return { ...d, pct, startAngle, dashValue };
  });

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex flex-col items-center w-full gap-8 py-2">
      {/* Donut ring — centered */}
      <div className="relative w-52 h-52 flex-shrink-0 group">
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800/50 rounded-full scale-95 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
        
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full -rotate-90 relative z-10 drop-shadow-xl">
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="rgba(241, 245, 249, 0.5)"
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
              strokeLinecap="round"
              strokeDasharray={`${seg.dashValue} ${C}`}
              className="transition-all duration-1000 ease-out"
              transform={`rotate(${seg.startAngle} ${CX} ${CY})`}
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-50 flex flex-col items-center justify-center transition-transform duration-500 group-hover:scale-110">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tighter leading-none">{total}</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-black mt-1">
              {totalLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Legend — Premium look */}
      <div className="w-full space-y-3 px-2">
        {data.map(d => {
          const pct = Math.round((d.value / total) * 100);
          const barW = Math.min(100, Math.round((d.value / maxValue) * 100));
          return (
            <div key={d.label} className="group/item">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shadow-sm flex-shrink-0 group-hover/item:scale-125 transition-transform"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                    {d.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200 tabular-nums">{d.value}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                    {pct}%
                  </span>
                </div>
              </div>
              
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-in-out group-hover/item:brightness-110"
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
