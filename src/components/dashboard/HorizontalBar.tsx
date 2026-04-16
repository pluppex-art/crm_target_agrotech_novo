import React from 'react';
import { cn } from '../../lib/utils';

interface HorizontalBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  rank: number;
  isCurrency?: boolean;
  count?: number;
}

export function HorizontalBar({ label, value, max, color, rank, isCurrency, count }: HorizontalBarProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}º`;

  const formattedValue = isCurrency
    ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : `${value}%`;

  const barWidth = value > 0 ? Math.max(pct, 8) : 0;
  const glowColor = color.replace('bg-', 'ring-').replace('500', '400/50');

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{medal}</span>
          <span className="text-sm font-semibold text-slate-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
              {count} {count === 1 ? 'venda' : 'vendas'}
            </span>
          )}
          <span className="text-xs font-bold text-slate-500">{formattedValue}</span>
        </div>
      </div>

      {/* Race track */}
<div className="relative h-6 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl shadow-inner overflow-hidden group-hover:shadow-md transition-all duration-300">
        {value > 0 ? (
          <>
            <div
              className={cn('h-full rounded-2xl shadow-lg relative overflow-hidden transition-all duration-1000 ease-out group-hover:shadow-xl group-hover:scale-[1.02]', color)}
              style={{ width: `${barWidth}%` }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform skew-x-12" />
              {/* Glow effect */}
              <div className={`absolute inset-0 ring-2 ring-offset-1 opacity-0 group-hover:opacity-100 transition-opacity ${glowColor}`} />
            </div>
            {/* Enhanced position marker */}
            <div
              className="absolute top-1/2 shadow-lg group-hover:scale-110 transition-all duration-300"
              style={{
                left: `${barWidth}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="text-lg leading-none select-none pointer-events-none drop-shadow-lg">
                {rank === 0 ? '🚀' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '⚡'}
              </span>
            </div>
          </>
        ) : (
          /* Empty track — show flag at start */
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs select-none opacity-50">
            🏁
          </span>
        )}
      </div>
    </div>
  );
}
