import { DailyReportData } from '../../services/reportDataService';
import { cn } from '../../lib/utils';

interface Props {
  data: DailyReportData;
  companyName?: string;
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Section({ title, color = 'slate' }: { title: string; color?: string }) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-600',
    green:   'bg-emerald-600',
    violet:  'bg-violet-600',
    amber:   'bg-amber-500',
    rose:    'bg-rose-600',
    slate:   'bg-slate-500',
    indigo:  'bg-indigo-600',
  };
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <div className={cn('w-1 h-5 rounded-full shrink-0', colors[color] ?? colors.slate)} />
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

function MetricRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <div className="text-right">
        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{value}</span>
        {sub && <span className="text-xs text-slate-400 ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm',
      className,
    )}>
      {children}
    </div>
  );
}

function ProgressBar({ value, max, color = 'emerald' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue:    'bg-blue-500',
    violet:  'bg-violet-500',
    rose:    'bg-rose-500',
    amber:   'bg-amber-500',
  };
  return (
    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all', colors[color] ?? colors.emerald)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function DailyReportView({ data, companyName = 'TARGET AGROTECH' }: Props) {
  const { leadsReceived, leadsResponded, leadsNotAttended, responseRate } = data;

  return (
    <div id="daily-report-content" className="space-y-5 print:space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200/40 dark:shadow-none print:rounded-lg">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">Relatório Diário</p>
            <h1 className="text-2xl font-black tracking-tight">{companyName}</h1>
          </div>
          <div className="text-right">
            <p className="text-emerald-200 text-xs font-semibold">Período</p>
            <p className="text-lg font-black">{data.dateLabel}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Leads recebidos', value: data.leadsReceived },
            { label: 'Taxa de resposta', value: `${data.responseRate}%` },
            { label: 'Vendas fechadas', value: data.salesCount },
            { label: 'Faturamento', value: brl(data.revenueGenerated) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-emerald-200 text-[10px] font-semibold uppercase tracking-wider mb-1">{label}</p>
              <p className="text-white font-black text-base leading-tight">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 1: Funil + Follow-up */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Funil */}
        <Card>
          <Section title="Funil do Período" color="blue" />
          <MetricRow label="Leads recebidos" value={leadsReceived} />
          <MetricRow
            label="Leads respondidos"
            value={leadsResponded}
            sub={`(${responseRate}%)`}
          />
          <MetricRow label="Leads não atendidos" value={leadsNotAttended} />
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Taxa de resposta</span>
              <span className={cn('font-bold', responseRate >= 80 ? 'text-emerald-600' : responseRate >= 60 ? 'text-amber-600' : 'text-red-500')}>
                {responseRate}%
              </span>
            </div>
            <ProgressBar
              value={leadsResponded}
              max={leadsReceived}
              color={responseRate >= 80 ? 'emerald' : responseRate >= 60 ? 'amber' : 'rose'}
            />
          </div>
        </Card>

        {/* Follow-up */}
        <Card>
          <Section title="Follow-up" color="violet" />
          <MetricRow label="Follow-ups previstos" value={data.followUpsScheduled} />
          <MetricRow label="Follow-ups realizados" value={data.followUpsDone} />
          <MetricRow label="Pendentes" value={data.followUpsPending} />
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Taxa de execução</span>
              <span className={cn('font-bold', data.followUpRate >= 80 ? 'text-emerald-600' : data.followUpRate >= 60 ? 'text-amber-600' : 'text-red-500')}>
                {data.followUpRate}%
              </span>
            </div>
            <ProgressBar value={data.followUpsDone} max={data.followUpsScheduled} color="violet" />
          </div>
          {data.followUpsPending > 0 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold">
              ⚠️ {data.followUpsPending} follow-up(s) ficaram pendentes
            </p>
          )}
        </Card>
      </div>

      {/* Row 2: SDR + Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* SDR */}
        <Card>
          <Section title="SDR / Qualificação" color="amber" />
          <MetricRow label="Leads desqualificados" value={data.leadsDisqualified} />
          <MetricRow label="Aguardando retorno" value={data.leadsAwaitingReturn} />
          {data.disqualificationReasons.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Motivos de desqualificação
              </p>
              <div className="space-y-2">
                {data.disqualificationReasons.map((r, i) => {
                  const total = data.disqualificationReasons.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                  return (
                    <div key={r.reason}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 dark:text-slate-400">
                          {i + 1}. {r.reason}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{r.count}</span>
                      </div>
                      <ProgressBar value={r.count} max={total} color="amber" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {data.disqualificationReasons.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">Nenhum motivo registrado no período.</p>
          )}
        </Card>

        {/* Resultados */}
        <Card>
          <Section title="Resultados" color="green" />
          <MetricRow label="Vendas do período" value={data.salesCount} />
          <MetricRow label="Faturamento gerado" value={brl(data.revenueGenerated)} />
          <MetricRow label="Comissão Pluppex (18%)" value={brl(data.commission)} />
          <div className={cn(
            'mt-4 p-3 rounded-xl text-center',
            data.salesCount > 0
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700',
          )}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Receita Total</p>
            <p className={cn('text-2xl font-black', data.salesCount > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500')}>
              {brl(data.revenueGenerated)}
            </p>
          </div>
        </Card>
      </div>

      {/* Comercial — per seller */}
      {data.sellers.length > 0 && (
        <Card>
          <Section title="Comercial — Detalhamento por Closer" color="indigo" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.sellers.map(s => (
              <div
                key={s.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{s.name}</p>
                  <span className={cn(
                    'text-[10px] font-black px-2 py-0.5 rounded-full',
                    s.productivity >= 70
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : s.productivity >= 40
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
                  )}>
                    {s.productivity}%
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Leads recebidos</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{s.leadsReceived}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Ligações realizadas</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{s.callsMade}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Tarefas concluídas</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{s.tasksCompleted}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Vendas</span>
                    <span className={cn('font-black', s.salesClosed > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
                      {s.salesClosed}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5">
                  <ProgressBar
                    value={s.productivity}
                    max={100}
                    color={s.productivity >= 70 ? 'emerald' : s.productivity >= 40 ? 'amber' : 'rose'}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Turmas */}
      {data.turmas.length > 0 && (
        <Card>
          <Section title="Turmas" color="violet" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.turmas.map(t => {
              const fillPct = t.goal > 0 ? Math.min(Math.round((t.confirmed / t.goal) * 100), 100) : 0;
              return (
                <div key={t.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="font-black text-slate-800 dark:text-slate-200 text-sm truncate">{t.name}</p>
                  {t.location && (
                    <p className="text-[11px] text-slate-400 mb-2">{t.location}</p>
                  )}
                  <div className="space-y-1 text-xs mb-2">
                    <div className="flex justify-between text-slate-500">
                      <span>Meta</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{t.goal} alunos</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Confirmados</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{t.confirmed}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Faltam</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{t.remaining}</span>
                    </div>
                  </div>
                  <ProgressBar
                    value={t.confirmed}
                    max={t.goal}
                    color={fillPct >= 80 ? 'emerald' : fillPct >= 50 ? 'blue' : 'amber'}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 text-right">{fillPct}% preenchido</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <Card>
          <Section title="Alertas do Período" color="rose" />
          <div className="space-y-2">
            {data.alerts.map((a, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-semibold border',
                  a.level === 'red'
                    ? 'bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                    : a.level === 'yellow'
                      ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                      : 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
                )}
              >
                <span className="text-base shrink-0">{a.level === 'red' ? '🔴' : a.level === 'yellow' ? '🟡' : '🟢'}</span>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Executive Summary */}
      <Card className="border-l-4 border-l-emerald-500">
        <Section title="Resumo Executivo" color="green" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {data.executiveSummary}
        </p>
      </Card>

      {/* Footer */}
      <p className="text-center text-[11px] text-slate-400 pb-2">
        Gerado automaticamente em {new Date().toLocaleString('pt-BR')} — CRM Target Agrotech
      </p>
    </div>
  );
}
