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
        className="flex flex-col items-center justify-center text-slate-300 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
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

  const colStyle = (): React.CSSProperties =>
    minBarWidth > 0
      ? { width: minBarWidth, flexShrink: 0 }
      : { flex: '1 1 0', minWidth: 48 };

  // Label area height below baseline
  const LABEL_HEIGHT = 80;

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
      <div style={{ minWidth: totalMinWidth }}>
        {/* Bar area */}
        <div className="flex items-end gap-3 px-4" style={{ height: chartHeight }}>
          {data.map((d, i) => {
            const barHeightPct = max > 0 ? (d.value / max) * 100 : 0;
            const barHeightPx = Math.max((barHeightPct * (chartHeight - 32)) / 100, d.value > 0 ? 8 : 0);
            const barColor = d.color ?? color;

            return (
              <div
                key={`col-${i}`}
                style={{ ...colStyle(), position: 'relative' }}
                className="flex flex-col items-center justify-end group pb-0"
              >
                {/* Value above bar */}
                {showValues && (
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 tabular-nums">
                    {d.sublabel ?? fmt(d.value)}
                  </span>
                )}

                {/* Bar */}
                <div
                  className="rounded-t-2xl transition-all duration-700 ease-out relative overflow-hidden group-hover:brightness-110 w-full"
                  style={{
                    height: barHeightPx,
                    backgroundColor: barColor,
                    boxShadow: barHeightPx > 0 ? `0 10px 25px -5px ${barColor}66` : 'none',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20" />
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-white dark:bg-slate-900/20" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Baseline */}
        <div className="mx-4 h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full" />

        {/* Labels below baseline */}
        <div className="flex gap-3 px-4" style={{ height: LABEL_HEIGHT }}>
          {data.map((d, i) => (
            <div
              key={`label-${i}`}
              style={{ ...colStyle(), overflow: 'hidden' }}
              className="flex items-start justify-center pt-2"
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
                  maxHeight: LABEL_HEIGHT - 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
