import React from 'react';
import { cn } from '../../lib/utils';

interface HorizontalBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  rank: number;
  isCurrency?: boolean;
}

export function HorizontalBar({ label, value, max, color, rank, isCurrency }: HorizontalBarProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const medal = rank === 0 ? '🥇 🚀' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}º`;
  
  const formattedValue = isCurrency 
    ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : `${value} leads`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{medal}</span>
          <span className="text-sm font-semibold text-slate-700">{label}</span>
        </div>
        <span className="text-xs font-bold text-slate-400">{formattedValue}</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000 ease-out', color)}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

