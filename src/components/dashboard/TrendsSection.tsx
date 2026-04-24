import { FunnelChart } from './FunnelChart';
import { Users, CheckCircle2, Filter, Trophy, TrendingUp, Target } from 'lucide-react';
import type { SalesMetrics } from '../../hooks/useSalesMetrics';
import { fmt } from '../../lib/utils';

interface TrendsSectionProps {
  sales: SalesMetrics;
  totalIncome: number;
  totalSalesGoal: number;
}

export function TrendsSection({ sales, totalIncome, totalSalesGoal }: TrendsSectionProps) {
  const totalPct = totalSalesGoal > 0 ? Math.min((totalIncome / totalSalesGoal) * 100, 100) : 0;
  const remaining = Math.max(totalSalesGoal - totalIncome, 0);

  const statusColor =
    totalPct >= 100
      ? { bar: '#10b981', badge: 'bg-emerald-100 text-emerald-700', ring: 'hsl(142, 71%, 45%)' }
      : totalPct >= 75
      ? { bar: '#3b82f6', badge: 'bg-blue-100 text-blue-700', ring: 'hsl(217, 91%, 60%)' }
      : totalPct >= 50
      ? { bar: '#f59e0b', badge: 'bg-amber-100 text-amber-700', ring: 'hsl(38, 92%, 50%)' }
      : { bar: '#ef4444', badge: 'bg-rose-100 text-rose-700', ring: 'hsl(0, 84%, 60%)' };

  const statusLabel =
    totalPct >= 100 ? '🏆 Meta Atingida!' :
    totalPct >= 75  ? '🔥 Quase lá!' :
    totalPct >= 50  ? '⚡ Em progresso' :
    '🎯 No início';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Pipeline Turmas */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
        <h3 className="font-bold text-xl text-slate-800 mb-6">Pipeline Turmas</h3>
        <FunnelChart
          stages={sales.attendeeStages.map((s, i) => ({
            label: s.label,
            count: s.value,
            color: s.color,
            icon: i === 0 ? Users : i === sales.attendeeStages.length - 1 ? CheckCircle2 : Filter,
          }))}
          conversionRate={sales.totalConversionRate}
        />
      </div>

      {/* Progresso da Meta Geral */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl text-slate-800">Progresso da Meta Geral</h3>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusColor.badge}`}>
            {statusLabel}
          </span>
        </div>

        {totalSalesGoal === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-slate-300">
            <Target className="w-12 h-12 opacity-40" />
            <p className="text-sm font-medium text-slate-400 text-center">
              Defina a meta da empresa em<br />
              <span className="font-bold text-slate-500">Configurações → Metas</span>
            </p>
          </div>
        ) : (
          <>
            {/* Resumo compacto */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp size={10} />
                  Receita
                </span>
                <span className="text-lg font-black text-slate-900 leading-tight">
                  R$ {fmt(totalIncome)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Target size={10} />
                  Meta
                </span>
                <span className="text-lg font-bold text-slate-600">
                  R$ {fmt(totalSalesGoal)}
                </span>
              </div>
              {remaining > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Trophy size={10} />
                    Faltam
                  </span>
                  <span className="text-base font-bold" style={{ color: statusColor.bar }}>
                    R$ {fmt(remaining)}
                  </span>
                </div>
              )}
            </div>

            {/* Barra de progresso resumida */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>0%</span>
                <span className="font-black text-sm" style={{ color: statusColor.bar }}>
                  {totalPct.toFixed(1)}%
                </span>
                <span>100%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${totalPct}%`, backgroundColor: statusColor.bar }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
