import React from 'react';
import { cn } from '../../lib/utils';
import { Users, Filter, FileText, CheckCircle } from 'lucide-react';

interface FunnelChartProps {
  stages: Array<{
    label: string;
    count: number;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  conversionRate?: number;
  emptyLabel?: string;
}

export function FunnelChart({ 
  stages, 
  conversionRate, 
  emptyLabel = 'Sem dados de pipeline'
}: FunnelChartProps) {
  const totalTop = stages[0]?.count || 0;
  const hasData = totalTop > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8 text-slate-300 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100">
        <Users className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium text-slate-400 mb-1">{emptyLabel}</p>
        <p className="text-sm text-slate-500">Acompanhe leads em cada etapa</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-xl">
      {/* Funnel SVG */}
      <div className="relative mb-6">
        <svg viewBox="0 0 300 200" className="w-full h-48 mx-auto">
          {/* Funnel body */}
          <defs>
            <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(210 20% 98%)" />
              <stop offset="100%" stopColor="hsl(210 20% 92%)" />
            </linearGradient>
          </defs>
          
          <path
            d="M 30 20 L 270 20 L 240 80 L 60 80 Z M 50 80 L 250 80 L 220 140 L 80 140 Z M 70 140 L 230 140 L 200 180 L 100 180 Z"
            fill="url(#funnelGrad)"
            stroke="hsl(210 20% 88%)"
            strokeWidth="1"
          />

          {/* Stages */}
          {stages.map((stage, i) => {
            const heightPct = (stage.count / totalTop) * 100;
            const Icon = stage.icon;
            return (
              <g key={stage.label}>
                {/* Bar */}
                <rect
                  x={55 + i * 20}
                  y={20 + (100 - heightPct) / 2}
                  width={20}
                  height={heightPct}
                  rx="8"
                  fill={stage.color}
                  className="drop-shadow-lg"
                />
                {/* Icon */}
                <g transform={`translate(${65 + i * 20}, ${15 + (100 - heightPct) / 2}) scale(0.7)`}>
                  <Icon className="w-8 h-8 text-white drop-shadow-sm" />
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stage details */}
      <div className="space-y-3">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={cn('w-3 h-3 rounded-full', stage.color)} />
              <span className="font-medium text-slate-700">{stage.label}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">{stage.count}</div>
              {i < stages.length - 1 && (
                <div className="text-xs text-slate-400">
                  {Math.round((stage.count / stages[i + 1]?.count || 1) * 100 - 100)}% drop
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {conversionRate && (
        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 p-3 bg-emerald-50/50 rounded-2xl">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">
            Taxa de conversão final: {conversionRate.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

