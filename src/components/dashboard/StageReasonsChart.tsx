import { useEffect, useState } from 'react';
import { stageReasonService, REASON_EMOJIS, type StageReasonSummary } from '../../services/stageReasonService';
import { cn } from '../../lib/utils';

type StageFilter = 'all' | 'aquecimento' | 'perdido';

interface StageReasonsChartProps {
  startDate?: string;
  endDate?: string;
}

const TAB_CONFIG: { key: StageFilter; label: string; color: string; bar: string }[] = [
  { key: 'all',         label: 'Todos',       color: 'text-slate-600 dark:text-slate-300',  bar: 'bg-violet-500' },
  { key: 'aquecimento', label: 'Aquecimento', color: 'text-blue-600 dark:text-blue-400',    bar: 'bg-blue-500'   },
  { key: 'perdido',     label: 'Perdido',     color: 'text-red-600 dark:text-red-400',      bar: 'bg-red-500'    },
];

export function StageReasonsChart({ startDate, endDate }: StageReasonsChartProps) {
  const [tab, setTab] = useState<StageFilter>('all');
  const [data, setData] = useState<StageReasonSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    stageReasonService
      .getSummaryByStage(tab, startDate, endDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [tab, startDate, endDate]);

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const maxCount = data[0]?.count ?? 1;

  const tabCfg = TAB_CONFIG.find(t => t.key === tab)!;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Motivos de Pausa / Perda</h3>
          <p className="text-xs text-slate-400 mt-0.5">Por que leads saíram do fluxo ativo</p>
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {TAB_CONFIG.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-3 py-1 rounded-lg text-[11px] font-bold transition-all',
                tab === key
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-300 dark:text-slate-700">
          <span className="text-4xl">📊</span>
          <p className="text-sm font-semibold text-slate-400">Nenhum dado ainda</p>
          <p className="text-xs text-slate-400">Os motivos aparecerão aqui quando leads forem movidos para Aquecimento ou Perdido.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(({ reason, count }) => {
            const pct = Math.round((count / total) * 100);
            const barWidth = Math.round((count / maxCount) * 100);
            return (
              <div key={reason} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-base">{REASON_EMOJIS[reason] ?? '❓'}</span>
                    {reason}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{pct}%</span>
                    <span className={cn('text-xs font-black tabular-nums', tabCfg.color)}>{count}</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', tabCfg.bar)}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Footer summary */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>{data.length} motivos registrados</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">{total} total</span>
          </div>
        </div>
      )}
    </div>
  );
}
