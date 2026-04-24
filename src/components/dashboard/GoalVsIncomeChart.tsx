import { TrendingUp } from 'lucide-react';

interface GoalVsIncomeChartProps {
  incomeData: Array<{ label: string; value: number }>;
  monthlyGoal: number;
}

export function GoalVsIncomeChart({ incomeData, monthlyGoal }: GoalVsIncomeChartProps) {
  const hasData = incomeData.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 p-8 text-slate-300 rounded-2xl border-2 border-dashed border-slate-200">
        <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium text-slate-400">Sem dados de receita</p>
      </div>
    );
  }

  const W = 340;
  const H = 160;
  const padTop = 24;
  const padBottom = 28;
  const padLeft = 8;
  const padRight = 8;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const values = incomeData.map(d => d.value);
  const maxValue = Math.max(...values, monthlyGoal, 1);

  const barGap = 8;
  const barWidth = (plotW - (incomeData.length - 1) * barGap) / incomeData.length;

  const barX = (i: number) => padLeft + i * (barWidth + barGap);
  const barY = (v: number) => padTop + (1 - v / maxValue) * plotH;
  const barHeight = (v: number) => (v / maxValue) * plotH;

  const goalY = barY(monthlyGoal);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k`
    : String(n);

  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/50 to-slate-100/50 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map((level, i) => (
          <line
            key={`grid-${i}`}
            x1={padLeft}
            y1={padTop + level * plotH}
            x2={W - padRight}
            y2={padTop + level * plotH}
            stroke="hsl(210 20% 90%)"
            strokeWidth="1"
          />
        ))}

        {/* Goal line (dashed) */}
        {monthlyGoal > 0 && (
          <g>
            <line
              x1={padLeft}
              y1={goalY}
              x2={W - padRight}
              y2={goalY}
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <text
              x={W - padRight}
              y={goalY - 6}
              textAnchor="end"
              style={{
                fontSize: '9px',
                fontWeight: 700,
                fill: '#64748b',
                fontFamily: 'inherit',
              }}
            >
              Meta: R$ {fmt(monthlyGoal)}
            </text>
          </g>
        )}

        {/* Bars */}
        {incomeData.map((d, i) => {
          const h = barHeight(d.value);
          const x = barX(i);
          const y = barY(d.value);
          const exceeded = monthlyGoal > 0 && d.value >= monthlyGoal;

          return (
            <g key={`bar-${i}`}>
              {/* Bar rect */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={4}
                fill={exceeded ? '#10b981' : '#3b82f6'}
                opacity="0.9"
              />

              {/* Value label above bar */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fill: exceeded ? '#059669' : '#2563eb',
                  fontFamily: 'inherit',
                }}
              >
                {fmt(d.value)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {incomeData.map((d, i) => (
          <text
            key={`label-${i}`}
            x={barX(i) + barWidth / 2}
            y={H - 8}
            textAnchor="middle"
            style={{
              fontSize: '10px',
              fontWeight: 500,
              fill: '#64748b',
              fontFamily: 'inherit',
            }}
          >
            {d.label.length > 4 ? d.label.slice(0, 3) + '.' : d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

