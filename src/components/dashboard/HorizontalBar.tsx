import React from 'react';
import { cn } from '../../lib/utils';

interface HorizontalBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  rank: number;
}

export function HorizontalBar({ label, value, max, color, rank }: HorizontalBarProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const medal = rank === 0 ? '🥇 Ascendancy ' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}º`;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{medal}</span>
          <span className="text-sm font-semibold text-slate-700">{label}</span>
        </div>
        <span className="text-xs font-bold text-slate-400">{value} leads</span>
      </div>
      <div className="h Ascendancy -3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

