import { useState, useEffect, useCallback } from 'react';
import { Users, AlertCircle, Loader2, RefreshCw, Play, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, Sparkles } from 'lucide-react';
import { oteService } from '../../services/oteService';
import { compensationProfileService } from '../../services/compensationProfileService';
import { CommissionResult, SemaphoreStatus } from '../../types/finance_v2';
import { fmt, cn } from '../../lib/utils';
import { filterOteBySquad, groupOteByRole } from '../../calculations/oteMetrics';

export function OteTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const periodMonth = startDate.substring(0, 7) + '-01';
  const [results, setResults] = useState<CommissionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recalcWarnings, setRecalcWarnings] = useState<string[]>([]);
  const [initSummary, setInitSummary] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'sellers' | 'managers'>('sellers');
  const [selectedSquad, setSelectedSquad] = useState<string>('all');
  const [squads, setSquads] = useState<{id: string, name: string}[]>([]);

  const loadResults = useCallback(async (autoInit = false) => {
    setIsLoading(true);
    setError(null);
    try {
      // Carrega squads e resultados em paralelo
      const [data, allSquads] = await Promise.all([
        oteService.getCommissionResults(periodMonth),
        compensationProfileService.getSquads()
      ]);
      
      setResults(data);
      
      // Filtra apenas squads ativos ou que tenham resultados no período
      const resultsSquadIds = new Set(data.map(r => r.squad_id).filter(Boolean));
      const filteredSquads = allSquads.filter(s => s.active || resultsSquadIds.has(s.id));
      setSquads(filteredSquads.map(s => ({ id: s.id, name: s.name })));
      
      // AUTO-INIT: If no results found OR all realized = 0 (stale from old buggy code)
      const allZero = data.length > 0 && data.every(r => Number(r.realized_revenue) === 0);
      if ((data.length === 0 || allZero) && autoInit && !isInitializing) {
        handleInitializePeriod(true);
      }
    } catch (err) {
      setError('Erro ao carregar resultados de comissão.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [periodMonth, isInitializing]);

  useEffect(() => {
    loadResults(true); // Pass true to enable auto-init on mount/period change
  }, [periodMonth]); // Only re-run when period changes

  const handleInitializePeriod = async (silent = false) => {
    if (!silent && !confirm(`Deseja inicializar o cálculo de OTE para o período ${periodMonth.substring(0, 7)}?`)) return;

    setIsInitializing(true);
    setError(null);
    setRecalcWarnings([]);
    setInitSummary(null);

    try {
      const { calculated, warnings } = await oteService.calculatePeriodFromProfiles(periodMonth);
      setRecalcWarnings(warnings);
      if (!silent) {
        setInitSummary(`✅ Processamento concluído: ${calculated} perfis calculados com sucesso.`);
      }
      
      // Reload results after init
      const data = await oteService.getCommissionResults(periodMonth);
      setResults(data);
    } catch (err) {
      setError('Erro ao inicializar período OTE.');
      console.error(err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm('Isso vai recalcular e sobrescrever os resultados OTE do período selecionado. Confirmar?')) return;

    setIsRecalculating(true);
    setError(null);
    setRecalcWarnings([]);
    setInitSummary(null);

    try {
      // Força o recálculo total a partir dos perfis ativos
      const { calculated, warnings } = await oteService.calculatePeriodFromProfiles(periodMonth);
      setRecalcWarnings(warnings);
      setInitSummary(`✅ Recálculo concluído: ${calculated} perfis atualizados.`);
      
      const data = await oteService.getCommissionResults(periodMonth);
      setResults(data);
    } catch (err) {
      setError('Erro ao recalcular OTE. Verifique as regras de comissão.');
      console.error(err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const { sellers, managers } = groupOteByRole(results);
  const displayPool = activeView === 'sellers' ? sellers : managers;
  const displayData = filterOteBySquad(displayPool, selectedSquad);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadResults()}
            disabled={isLoading}
            className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-colors text-slate-500"
            title="Atualizar"
          >
            <RefreshCw size={18} className={cn((isLoading || isInitializing) && 'animate-spin')} />
          </button>
          
          {(isInitializing || isLoading) && (
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
              <Sparkles size={12} /> Sincronizando Período Automático
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating || isInitializing || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-60"
          >
            {isRecalculating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Recalcular OTE
          </button>

          <select
            value={selectedSquad}
            onChange={(e) => setSelectedSquad(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all"
          >
            <option value="all">Todos os Squads</option>
            {squads.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Init summary */}
      {initSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">{initSummary}</p>
        </div>
      )}

      {/* Recalculation Warnings */}
      {recalcWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <span className="text-sm font-bold text-amber-800">
              {recalcWarnings.length} alerta(s) de configuração:
            </span>
          </div>
          {recalcWarnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-700 pl-6">• {w}</p>
          ))}
        </div>
      )}

      {/* View Selector */}
      <div className="flex gap-3">
        <ViewToggle label={`Vendedores / Closers (${sellers.length})`} active={activeView === 'sellers'} onClick={() => setActiveView('sellers')} />
        <ViewToggle label={`Gestores / Gestoras (${managers.length})`} active={activeView === 'managers'} onClick={() => setActiveView('managers')} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
        {isLoading || isInitializing ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-500 text-sm font-bold animate-pulse uppercase tracking-widest text-[10px]">Calculando Comissões...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 p-6">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
            <p className="text-rose-600 font-semibold text-center">{error}</p>
            <button onClick={() => loadResults()} className="mt-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-100">
              Tentar novamente
            </button>
          </div>
        ) : displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-6">
            <Users className="w-16 h-16 text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">Nenhum resultado encontrado.</p>
            <p className="text-slate-400 text-xs mt-1">Verifique se os perfis OTE e regras de comissão estão configurados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 font-black tracking-widest">
                <tr>
                  <th className="px-5 py-4">Colaborador / Gestor(a)</th>
                  <th className="px-5 py-4">Nível</th>
                  <th className="px-5 py-4">Squad</th>
                  <th className="px-5 py-4 text-right">Meta</th>
                  <th className="px-5 py-4 text-right">Realizado</th>
                  <th className="px-5 py-4 text-center">Atingimento</th>
                  <th className="px-5 py-4 text-center">Semáforo</th>
                  <th className="px-5 py-4 text-right">Fixo</th>
                  <th className="px-5 py-4 text-right">Variável</th>
                  <th className="px-5 py-4 text-right">Acelerador</th>
                  <th className="px-5 py-4 text-right">Total OTE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayData.map((r) => (
                  <OteRow key={r.id} result={r} showSquad={true} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OteRow({ result, showSquad }: { result: CommissionResult; showSquad: boolean }) {
  const achPct = Number(result.achievement_percent) || 0;
  const hasLevel = !!result.level?.trim();

  return (
    <tr className={cn('hover:bg-slate-50/80 transition-colors', !hasLevel && 'bg-amber-50/30')}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
              {(result.user_name || result.user_id).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">{result.user_name || result.user_id.substring(0, 8) + '…'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{result.role_type}</p>
            </div>
        </div>
      </td>
      <td className="px-5 py-4">
        {hasLevel ? (
          <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest">
            {result.level}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase">
            <AlertTriangle size={10} /> S/ Nível
          </span>
        )}
      </td>
      {showSquad && (
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            {result.squad_color && (
              <div 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: result.squad_color }} 
              />
            )}
            <span className="text-slate-600 text-xs font-bold uppercase truncate max-w-[120px]">
              {result.squad_name || '—'}
            </span>
          </div>
        </td>
      )}
      <td className="px-5 py-4 text-right font-bold text-slate-600 text-xs">R$ {fmt(result.target_revenue)}</td>
      <td className="px-5 py-4 text-right font-bold text-slate-800 text-xs">R$ {fmt(result.realized_revenue)}</td>
      <td className="px-5 py-4 text-center">
        <AchievementBadge pct={achPct} />
      </td>
      <td className="px-5 py-4 text-center">
        <SemaphoreIndicator status={result.semaphore_status} />
      </td>
      <td className="px-5 py-4 text-right text-slate-500 text-xs">R$ {fmt(result.fixed_amount)}</td>
      <td className="px-5 py-4 text-right text-slate-500 text-xs">R$ {fmt(result.variable_amount)}</td>
      <td className="px-5 py-4 text-right text-slate-500 text-xs">
        {result.accelerator_amount > 0 ? (
          <span className="text-emerald-600 font-black">+ R$ {fmt(result.accelerator_amount)}</span>
        ) : '—'}
      </td>
      <td className="px-5 py-4 text-right">
        <span className="font-black text-emerald-600 text-sm tracking-tighter">R$ {fmt(result.total_amount)}</span>
      </td>
    </tr>
  );
}

function AchievementBadge({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'bg-emerald-50 text-emerald-600' : pct >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black', color)}>
      {pct >= 100 ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      {pct.toFixed(1)}%
    </span>
  );
}

function SemaphoreIndicator({ status }: { status: SemaphoreStatus }) {
  const config = {
    GREEN: { color: 'bg-emerald-500', label: 'NO ALVO' },
    YELLOW: { color: 'bg-amber-400', label: 'EM RISCO' },
    RED: { color: 'bg-rose-500', label: 'CRÍTICO' },
  };
  const s = config[status];
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className={cn('w-2 h-2 rounded-full', s.color)} />
      <span className="text-[9px] font-black text-slate-400 tracking-tight">{s.label}</span>
    </div>
  );
}

function ViewToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all',
        active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
      )}
    >
      {label}
    </button>
  );
}
