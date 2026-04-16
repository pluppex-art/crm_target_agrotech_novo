import { TrendingUp } from 'lucide-react';

interface LineTrendChartProps {
  data: Array<{ label: string; value: number }>;
  color?: string;
  trend?: 'up' | 'down';
  emptyLabel?: string;
  suffix?: string;
}

export function LineTrendChart({
  data,
  color = 'hsl(142, 71%, 45%)',
  trend = 'up',
  emptyLabel = 'Sem dados para tendência',
  suffix = '',
}: LineTrendChartProps) {
  const hasData = data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 p-8 text-slate-300 rounded-2xl border-2 border-dashed border-slate-200">
        <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  // SVG coordinate space
  const W = 340;
  const H = 140;
  const padTop = 30;
  const padBottom = 8;
  const padLeft = 12;
  const padRight = 12;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const xPos = (i: number) =>
    padLeft + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const yPos = (v: number) => padTop + (1 - (v - min) / range) * plotH;

  const pointsStr = data.map((d, i) => `${xPos(i)},${yPos(d.value)}`).join(' ');

  // Area path below the line
  const areaD =
    data.length > 1
      ? `M ${xPos(0)} ${yPos(data[0].value)} ` +
        data
          .slice(1)
          .map((d, i) => `L ${xPos(i + 1)} ${yPos(d.value)}`)
          .join(' ') +
        ` L ${xPos(data.length - 1)} ${padTop + plotH} L ${xPos(0)} ${padTop + plotH} Z`
      : '';

  const formatValue = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/50 to-slate-100/50 overflow-hidden">
      {/* Trend badge */}
      <div className="flex justify-end px-4 pt-3">
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
            trend === 'up'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-rose-50 text-rose-600'
          }`}
        >
          {trend === 'up' ? '↗ Crescendo' : '↘ Caindo'}
        </span>
      </div>

      {/* Chart SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map((level, i) => (
          <line
            key={i}
            x1={padLeft}
            y1={padTop + level * plotH}
            x2={W - padRight}
            y2={padTop + level * plotH}
            stroke="hsl(210 20% 90%)"
            strokeWidth="1"
          />
        ))}

        {/* Area fill */}
        {areaD && (
          <path d={areaD} fill={color} fillOpacity="0.08" />
        )}

        {/* Line */}
        <polyline
          points={pointsStr}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points + value labels */}
        {data.map((d, i) => (
          <g key={`${d.label}-${i}`}>
            {/* Value label above the point */}
            <text
              x={xPos(i)}
              y={yPos(d.value) - 10}
              textAnchor="middle"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                fill: 'hsl(215 25% 30%)',
                fontFamily: 'inherit',
              }}
            >
              {formatValue(d.value)}{suffix}
            </text>

            {/* Data point */}
            <circle
              cx={xPos(i)}
              cy={yPos(d.value)}
              r="4.5"
              fill="white"
              stroke={color}
              strokeWidth="2.5"
            />
          </g>
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between px-3 pb-3">
        {data.map((d, i) => (
          <span
            key={`label-${i}`}
            className="text-[10px] text-slate-400 font-medium text-center"
            style={{ width: `${100 / data.length}%` }}
          >
            {d.label.length > 4 ? d.label.slice(0, 3) + '.' : d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
