import { cn } from '../../lib/utils';

interface HorizontalBarProps {
  label: string;
  value: number;
  received: number;
  max: number;
  percentage: number;
  color?: string; // Kept for backwards compatibility but we override with beautiful gradients
  rank: number;
  count?: number;
  squad?: { name: string; color: string };
}

const getGradient = (rank: number) => {
  switch (rank) {
    case 0:
      return 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300';
    case 1:
      return 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400';
    case 2:
      return 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300';
    case 3:
      return 'bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-400';
    default:
      return 'bg-gradient-to-r from-slate-500 via-slate-400 to-slate-300';
  }
};

export function HorizontalBar({ label, received, max, percentage: precomputedPct, rank, count, squad }: HorizontalBarProps) {
  const pct = (max > 0 && received > 0) ? Math.min((received / max) * 100, 100) : precomputedPct;
  const barWidth = pct > 0 ? Math.max(pct, 6) : 0;
  const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}º`;
  const percentage = Math.round(pct);
  const barColor = getGradient(rank);

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <span className="text-sm shrink-0 font-bold text-slate-400 w-6">{medal}</span>
          <div className="flex items-center gap-2 truncate">
            <span className="text-sm font-bold text-slate-800 truncate">{label}</span>
            {squad && (
              <span 
                className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0"
                style={{ 
                  backgroundColor: squad.name.toUpperCase() === 'PLUPPEX' ? '#f5f3ff' : '#f0fdf4',
                  color: squad.name.toUpperCase() === 'PLUPPEX' ? '#7c3aed' : '#16a34a'
                }}
              >
                {squad.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {count !== undefined && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
              {count}{max > 0 ? ` / ${max}` : ''} {count === 1 && max <= 0 ? 'ganho' : 'ganhos'}
            </span>
          )}
          <span className="text-xs font-bold text-slate-600">{percentage}%</span>
        </div>
      </div>

      <div className="relative h-5 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl shadow-inner overflow-hidden group-hover:shadow-md transition-all duration-300">
        {barWidth > 0 ? (
          <>
            <div
              className={cn('h-full rounded-2xl shadow-lg relative overflow-hidden transition-all duration-1000 ease-out group-hover:shadow-xl', barColor)}
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
