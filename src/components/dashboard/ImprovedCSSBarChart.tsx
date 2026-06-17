import { BarChart2 } from 'lucide-react';

interface BarItem {
  label: string;
  value: number;
  max?: number;
  color?: string;
  sublabel?: string;
  badge?: string;
}

interface ImprovedCSSBarChartProps {
  data: BarItem[];
  color?: string;
  showValues?: boolean;
  emptyLabel?: string;
  minBarWidth?: number;
  chartHeight?: number;
  variant?: 'bars' | 'cards';
}

export function ImprovedCSSBarChart({
  data,
  color = '#10b981',
  showValues = true,
  emptyLabel = 'Sem dados ainda',
  minBarWidth = 0,
  chartHeight = 220,
  variant = 'bars',
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

  if (variant === 'cards') {
    return (
      <div className="flex flex-col gap-2 w-full">
        {data.map((d, i) => {
          const barColor = d.color ?? color;
          const cardMax = d.max ?? 1;
          const pct = cardMax > 0 ? Math.min((d.value / cardMax) * 100, 100) : 0;

          return (
            <div
              key={i}
              className="rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-px transition-all duration-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              {/* main row */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                {/* colored indicator dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: barColor, boxShadow: `0 0 6px ${barColor}88` }}
                />
                {/* name */}
                <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {d.label}
                </span>
                {d.badge && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    {d.badge}
                  </span>
                )}
                {/* value + pct */}
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-sm font-black tabular-nums" style={{ color: barColor }}>
                    {d.sublabel ?? fmt(d.value)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums w-7 text-right">
                    {Math.round(pct)}%
                  </span>
                </div>
              </div>

              {/* progress track */}
              <div className="h-1 bg-slate-100 dark:bg-slate-700/60 mx-3 mb-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: barColor, opacity: 0.85 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const totalMinWidth = minBarWidth > 0 ? data.length * minBarWidth : undefined;

  const colStyle = (): React.CSSProperties =>
    minBarWidth > 0
      ? { width: minBarWidth, flexShrink: 0 }
      : { flex: '1 1 0', minWidth: 48 };

  // Label area height below baseline
  const LABEL_HEIGHT = 140;

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
      <div style={{ minWidth: totalMinWidth }}>
        {/* Bar area */}
        <div className="flex items-end gap-5 px-4" style={{ height: chartHeight }}>
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
        <div className="flex gap-5 px-4" style={{ height: LABEL_HEIGHT }}>
          {data.map((d, i) => (
            <div
              key={`label-${i}`}
              style={{ ...colStyle() }}
              className="flex items-start justify-center pt-2 overflow-hidden"
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
                  maxHeight: LABEL_HEIGHT - 12,
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
