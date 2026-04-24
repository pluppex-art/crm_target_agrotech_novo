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
  chartHeight = 180,
}: ImprovedCSSBarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <div
        className="flex flex-col items-center justify-center text-slate-300 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50"
        style={{ height: chartHeight + 40 }}
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

  const totalMinWidth = minBarWidth > 0 ? data.length * minBarWidth : undefined;

  const colWidth = (): React.CSSProperties =>
    minBarWidth > 0
      ? { width: minBarWidth, flexShrink: 0 }
      : { flex: '1 1 0', minWidth: 36 };

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: totalMinWidth }}>
        {/* Bars + inline labels */}
        <div className="flex items-end gap-2 px-1" style={{ height: chartHeight }}>
          {data.map((d, i) => {
            const barHeightPx = max > 0
              ? Math.max((d.value / max) * chartHeight * 0.78, d.value > 0 ? 6 : 0)
              : 0;
            const barColor = d.color ?? color;
            const LABEL_W = 12;
            const labelMaxH = chartHeight - 20;

            return (
              <div
                key={`col-${i}`}
                style={{ ...colWidth(), height: chartHeight, position: 'relative', overflow: 'hidden' }}
                className="flex flex-col items-end justify-end pb-1 gap-0.5 group"
              >
                {/* Value number above bar */}
                {showValues && (
                  <span className="text-[11px] font-bold text-slate-700 leading-none mb-0.5 shrink-0">
                    {d.sublabel ?? fmt(d.value)}
                  </span>
                )}

                {/* Bar — offset right to leave room for label */}
                <div
                  className="rounded-t-xl transition-all duration-700 group-hover:brightness-110 shrink-0"
                  style={{
                    width: `calc(100% - ${LABEL_W}px)`,
                    height: barHeightPx,
                    backgroundColor: barColor,
                    boxShadow: barHeightPx > 0 ? `0 -2px 8px ${barColor}44` : 'none',
                  }}
                />

                {/* Label — always visible, absolute at left strip */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 0,
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
                      fontSize: 9,
                      fontWeight: 500,
                      lineHeight: 1,
                      color: '#475569',
                    }}
                  >
                    {d.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Baseline */}
        <div className="border-t-2 border-slate-200" />
      </div>
    </div>
  );
}
