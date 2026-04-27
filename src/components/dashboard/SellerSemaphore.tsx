import React, { useState, useMemo } from 'react';
import { TrafficCone, Target, TrendingUp, ChevronDown, User } from 'lucide-react';
import { fmt } from '../../lib/utils';

interface SellerSemaphoreProps {
  data: Array<{
    label: string;
    value: number;
    received: number;
    count: number;
    percentage: number;
    revenue_goal: number;
    pct: number;
    color: 'red' | 'yellow' | 'green' | 'gold';
    colorClass: string;
    barColor: string;
  }>;
  currentSellerName?: string | null;
  isAdmin: boolean;
  companyRevenueGoal?: number;
}

export function SellerSemaphore({ data, currentSellerName, isAdmin, companyRevenueGoal }: SellerSemaphoreProps) {
  const visibleData = isAdmin
    ? data
    : data.filter((s) => s.label === currentSellerName);

  const [selectedSellerName, setSelectedSellerName] = useState<string>('Total da Empresa');

  const activeSeller = useMemo(() => {
    if (!isAdmin) {
      return visibleData[0] || data[0];
    }
    
    if (selectedSellerName !== 'Total da Empresa') {
      return visibleData.find((s) => s.label === selectedSellerName) || visibleData[0];
    }
    
    // Calculate totals for the company
    const totalReceived = visibleData.reduce((acc, curr) => acc + curr.received, 0);
    const totalValue = visibleData.reduce((acc, curr) => acc + curr.value, 0);
    const totalCount = visibleData.reduce((acc, curr) => acc + curr.count, 0);
    const goal = companyRevenueGoal || 1; // Prevent division by zero
    const pct = Math.min((totalReceived / goal) * 100, 100);
    
    let color: 'red' | 'yellow' | 'green' | 'gold' = 'red';
    let barColor = '#ef4444';
    if (pct >= 100) { color = 'gold'; barColor = '#eab308'; }
    else if (pct >= 70) { color = 'green'; barColor = '#10b981'; }
    else if (pct >= 40) { color = 'yellow'; barColor = '#f59e0b'; }

    return {
      label: 'Total da Empresa',
      value: totalValue,
      received: totalReceived,
      count: totalCount,
      percentage: pct,
      revenue_goal: companyRevenueGoal || 0,
      pct: Math.round(pct),
      color,
      colorClass: `bg-${color}-500`,
      barColor
    };
  }, [isAdmin, visibleData, data, companyRevenueGoal, selectedSellerName]);

  const statusLabels: Record<string, string> = {
    red: 'Abaixo da Meta',
    yellow: 'Em Progresso',
    green: 'Meta Atingida',
    gold: 'Superou a Meta!',
  };

  const statusConfig: Record<string, { text: string; border: string; bg: string; dot: string }> = {
    red: { text: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50', dot: 'bg-red-400' },
    yellow: { text: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50', dot: 'bg-amber-400' },
    green: { text: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
    gold: { text: 'text-yellow-600', border: 'border-yellow-200', bg: 'bg-yellow-50', dot: 'bg-yellow-400' },
  };

  // Gauge math — 180° semicircle
  const radius = 86;
  const centerX = 100;
  const centerY = 100;
  const pctValue = Math.min(activeSeller.pct, 100);
  const angle = Math.PI * (1 - pctValue / 100);
  const endX = centerX + radius * Math.cos(angle);
  const endY = centerY - radius * Math.sin(angle);

  const bgArc = `M 14 100 A ${radius} ${radius} 0 0 1 186 100`;
  const fillArc = `M 14 100 A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  // Ticks for gauge
  const ticks = useMemo(() => {
    const t = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (1 - i / 10);
      const x1 = centerX + (radius - 14) * Math.cos(a);
      const y1 = centerY - (radius - 14) * Math.sin(a);
      const x2 = centerX + (radius - 4) * Math.cos(a);
      const y2 = centerY - (radius - 4) * Math.sin(a);
      t.push({ x1, y1, x2, y2 });
    }
    return t;
  }, []);

  if (visibleData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrafficCone className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-800">Semáforo dos Vendedores</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-slate-300">
          <Target className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-xs font-medium">Nenhum vendedor disponível</p>
        </div>
      </div>
    );
  }

  const cfg = statusConfig[activeSeller.color];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-50 rounded-lg">
            <TrafficCone className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="font-bold text-slate-800">Semáforo dos Vendedores</h3>
        </div>
        {isAdmin ? (
          <div className="relative">
            <select
              value={selectedSellerName}
              onChange={(e) => setSelectedSellerName(e.target.value)}
              className="appearance-none text-xs font-semibold border border-slate-200 rounded-lg pl-3 pr-7 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="Total da Empresa">Total da Empresa</option>
              {visibleData.map((seller) => (
                <option key={seller.label} value={seller.label}>
                  {seller.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          visibleData.length === 1 && (
            <span className="text-xs font-medium text-slate-400">Seu progresso</span>
          )
        )}
      </div>

      {/* Seller name display */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
          <User className={`w-4 h-4 ${cfg.text}`} />
        </div>
        <span className="text-sm font-semibold text-slate-700">{activeSeller.label}</span>
      </div>

      {/* Gauge Chart */}
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-[260px]">
          <svg viewBox="0 0 200 124" className="w-full drop-shadow-sm">
            {/* Background arc */}
            <path
              d={bgArc}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="18"
              strokeLinecap="round"
            />
            {/* Ticks */}
            {ticks.map((tick, i) => (
              <line
                key={i}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={i % 5 === 0 ? '#cbd5e1' : '#e2e8f0'}
                strokeWidth={i % 5 === 0 ? 2 : 1}
                strokeLinecap="round"
              />
            ))}
            {/* Fill arc with animation */}
            <path
              d={fillArc}
              fill="none"
              stroke={activeSeller.barColor}
              strokeWidth="18"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.08))' }}
            />
            {/* Center percentage */}
            <text
              x="100"
              y="76"
              textAnchor="middle"
              className="fill-slate-800"
              style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'system-ui, sans-serif' }}
            >
              {activeSeller.pct}%
            </text>
            <text
              x="100"
              y="94"
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: '10px', fontWeight: '600', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.08em' }}
            >
              META ALCANÇADA
            </text>
          </svg>
        </div>

        {/* Details Cards */}
        <div className="w-full mt-6 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
          <div className="flex divide-x divide-slate-200">
            <div className="flex-1 py-3.5 px-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Meta (R$)
                </p>
              </div>
              <p className="text-sm font-bold text-slate-700">
                R$ {fmt(activeSeller.revenue_goal)}
              </p>
            </div>
            <div className="flex-1 py-3.5 px-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Recebido (R$)
                </p>
              </div>
              <p className="text-sm font-bold text-slate-700">
                R$ {fmt(activeSeller.received)}
              </p>
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-4">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${cfg.text} ${cfg.border} ${cfg.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {statusLabels[activeSeller.color]}
          </span>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-5 flex-wrap">
        {[
          { label: 'Abaixo da Meta', dot: 'bg-red-400' },
          { label: 'Em Progresso', dot: 'bg-amber-400' },
          { label: 'Meta Atingida', dot: 'bg-emerald-400' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span className={`w-2 h-2 rounded-full ${item.dot}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

