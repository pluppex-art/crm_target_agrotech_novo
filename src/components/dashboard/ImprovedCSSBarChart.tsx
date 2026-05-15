import { BarChart2 } from 'lucide-react';

interface BarItem {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}

interface ImprovedCSSBarChartProps {
  data: BarItem[];
  color?: string;
  showValues?: boolean;
  emptyLabel?: string;
  minBarWidth?: number;
  chartHeight?: number;
}

export function ImprovedCSSBarChart({
  data,
  color = '#10b981',
  showValues = true,
  emptyLabel = 'Sem dados ainda',
  minBarWidth = 0,
  chartHeight = 220,
}: ImprovedCSSBarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <div
        className="flex flex-col items-center justify-center text-slate-300 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50"
        style={{ height: chartHeight + 40 }}
      >
        <BarChart2 className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{emptyLabel}</p>
      </div>
    );
  }

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k`
    : String(n);

  const totalMinWidth = minBarWidth > 0 ? data.length * minBarWidth : undefined;

  const colWidth = (): React.CSSProperties =>
    minBarWidth > 0
      ? { width: minBarWidth, flexShrink: 0 }
      : { flex: '1 1 0', minWidth: 48 };

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
      <div style={{ minWidth: totalMinWidth }}>
        <div className="flex items-end gap-3 px-4" style={{ height: chartHeight }}>
          {data.map((d, i) => {
            const barHeightPct = max > 0 ? (d.value / max) * 100 : 0;
            const barHeightPx = Math.max((barHeightPct * (chartHeight - 40)) / 100, d.value > 0 ? 8 : 0);
            const barColor = d.color ?? color;
            const LABEL_W = 16;
            const labelMaxH = chartHeight - 40;

            return (
              <div
                key={`col-${i}`}
                style={{ ...colWidth(), height: chartHeight, position: 'relative' }}
                className="flex flex-col items-center justify-end group pt-6"
              >
                {/* Value tooltip-like number above bar */}
                {showValues && (
                  <div className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded-md mb-1 z-20 pointer-events-none whitespace-nowrap shadow-lg">
                    {d.sublabel ?? fmt(d.value)}
                  </div>
                )}
                
                {showValues && (
                   <span className="text-[10px] font-black text-slate-500 mb-2 tabular-nums">
                     {d.sublabel ?? fmt(d.value)}
                   </span>
                )}

                {/* Bar */}
                <div
                  className="rounded-t-2xl transition-all duration-700 ease-out relative overflow-hidden group-hover:brightness-110"
                  style={{
                    width: `calc(100% - ${LABEL_W}px)`,
                    height: barHeightPx,
                    backgroundColor: barColor,
                    boxShadow: barHeightPx > 0 ? `0 10px 25px -5px ${barColor}66` : 'none',
                  }}
                >
                   {/* Gradient highlight */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20" />
                   <div className="absolute top-0 inset-x-0 h-[2px] bg-white/20" />
                </div>

                {/* Label — Vertical */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 2,
                    width: LABEL_W,
                    height: labelMaxH,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-end',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    title={d.label}
                    style={{
                      writingMode: 'vertical-rl' as const,
                      transform: 'rotate(180deg)',
                      whiteSpace: 'nowrap',
                      fontSize: 10,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: '#94a3b8',
                      letterSpacing: '-0.02em',
                      textTransform: 'uppercase',
                    }}
                    className="group-hover:text-slate-600 transition-colors duration-300"
                  >
                    {d.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Improved Baseline */}
        <div className="mx-2 h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full mt-1" />
      </div>
    </div>
  );
}
