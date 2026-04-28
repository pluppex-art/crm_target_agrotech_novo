import { Trophy, TrendingUp, Target } from 'lucide-react';
import type { SalesMetrics } from '../../hooks/useSalesMetrics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendsSectionProps {
  sales: SalesMetrics;
  totalAchieved: number;
  totalGoal: number;
}

export function TrendsSection({ sales, totalAchieved, totalGoal }: TrendsSectionProps) {
  const totalPct = totalGoal > 0 ? Math.min((totalAchieved / totalGoal) * 100, 100) : 0;
  const remaining = Math.max(totalGoal - totalAchieved, 0);

  const statusColor =
    totalPct >= 100
      ? { bar: '#10b981', badge: 'bg-emerald-100 text-emerald-700' }
      : totalPct >= 75
      ? { bar: '#3b82f6', badge: 'bg-blue-100 text-blue-700' }
      : totalPct >= 50
      ? { bar: '#f59e0b', badge: 'bg-amber-100 text-amber-700' }
      : { bar: '#ef4444', badge: 'bg-rose-100 text-rose-700' };

  const statusLabel =
    totalPct >= 100 ? '🏆 Meta Atingida!' :
    totalPct >= 75  ? '🔥 Quase lá!' :
    totalPct >= 50  ? '⚡ Em progresso' :
    '🎯 No início';

  const chartData = sales.monthlySales.map(m => ({
    name: m.label,
    ganhos: m.value,
    meta: totalGoal > 0 ? totalGoal : 0,
  }));

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xl text-slate-800">Progresso da Meta Geral</h3>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusColor.badge}`}>
          {statusLabel}
        </span>
      </div>

      {totalGoal === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-slate-300">
          <Target className="w-12 h-12 opacity-40" />
          <p className="text-sm font-medium text-slate-400 text-center">
            Defina a meta de leads da empresa em<br />
            <span className="font-bold text-slate-500">Configurações → Metas</span>
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp size={10} />
                Ganhos (Total)
              </span>
              <span className="text-lg font-black text-slate-900 leading-tight">
                {totalAchieved}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Target size={10} />
                Meta (Leads)
              </span>
              <span className="text-lg font-bold text-slate-600">
                {totalGoal}
              </span>
            </div>
            {remaining > 0 ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Trophy size={10} />
                  Faltam
                </span>
                <span className="text-base font-bold" style={{ color: statusColor.bar }}>
                  {remaining}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Trophy size={10} />
                  Status
                </span>
                <span className="text-base font-bold text-emerald-600">
                  Batida
                </span>
              </div>
            )}
          </div>

          <div className="h-[220px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 700 }}
                  labelStyle={{ fontWeight: 600, color: '#64748b', marginBottom: '4px' }}
                  formatter={(value: number, name: string) => [value, name === 'ganhos' ? 'Ganhos no Mês' : 'Meta Fixa']}
                />
                <Line 
                  type="monotone" 
                  dataKey="meta" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
                  activeDot={false}
                  name="meta"
                />
                <Line 
                  type="monotone" 
                  dataKey="ganhos" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#f59e0b' }}
                  activeDot={{ r: 7, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                  name="ganhos"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
