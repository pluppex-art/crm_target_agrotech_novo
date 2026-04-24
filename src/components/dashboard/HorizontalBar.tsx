import { cn } from '../../lib/utils';

interface HorizontalBarProps {
  label: string;
  value: number;
  received: number;
  max: number;
  percentage: number; // pre-computed fallback when max=0
  color: string;
  rank: number;
  count?: number;
}

export function HorizontalBar({ label, received, max, percentage: precomputedPct, color, rank, count }: HorizontalBarProps) {
  const pct = (max > 0 && received > 0) ? Math.min((received / max) * 100, 100) : precomputedPct;
  const barWidth = pct > 0 ? Math.max(pct, 6) : 0;
  const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}º`;
  const percentage = Math.round(pct);

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <span className="text-sm shrink-0">{medal}</span>
          <span className="text-sm font-semibold text-slate-700 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {count !== undefined && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
              {count} {count === 1 ? 'venda' : 'vendas'}
            </span>
          )}
          <span className="text-xs font-bold text-slate-600">{percentage}%</span>
        </div>
      </div>

<div className="relative h-5 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl shadow-inner overflow-hidden group-hover:shadow-md transition-all duration-300">
        {barWidth > 0 ? (
          <>
            <div
              className={cn('h-full rounded-2xl shadow-lg relative overflow-hidden transition-all duration-1000 ease-out group-hover:shadow-xl', color)}
              style={{ width: `${barWidth}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform skew-x-12" />
            </div>
            <div
              className="absolute top-1/2 shadow-lg transition-all duration-300"
              style={{ left: `${barWidth}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span className="text-base leading-none select-none pointer-events-none drop-shadow-lg">
                {rank === 0 ? '🚀' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '⚡'}
              </span>
            </div>
          </>
        ) : (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs select-none opacity-50">🏁</span>
        )}
      </div>
    </div>
  );
}
