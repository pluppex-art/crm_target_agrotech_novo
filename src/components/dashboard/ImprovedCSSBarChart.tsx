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
  showValues = true,
  emptyLabel = 'Sem dados ainda',
}: ImprovedCSSBarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const hasData = data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[180px] text-slate-300 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
        <BarChart2 className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm font-semibold text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(0)}k`
      : n.toLocaleString('pt-BR');

  return (
    <div className="w-full flex flex-col flex-1">
      <div className="flex items-end gap-2 flex-1 min-h-[180px] pb-1">
        {data.map((d, i) => {
          const pct = Math.max((d.value / max) * 100, 3);
          return (
            <div
              key={`${d.label}-${i}`}
              className="flex-1 flex flex-col items-center justify-end gap-1 h-full group min-w-0"
            >
              {showValues && (
                <span className="text-[11px] font-bold text-slate-600 leading-none">
                  {fmt(d.value)}
                </span>
              )}
              <div
                className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80 min-w-[20px]"
                style={{
                  height: `${pct}%`,
                  backgroundColor: color,
                  opacity: 0.85 + (i % 2) * 0.1,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-2 border-t border-slate-100 pt-2">
        {data.map((d, i) => (
          <div key={`label-${i}`} className="flex-1 text-center min-w-0">
            <span
              className="text-[10px] font-medium text-slate-500 leading-tight block truncate px-0.5"
              title={d.label}
            >
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
