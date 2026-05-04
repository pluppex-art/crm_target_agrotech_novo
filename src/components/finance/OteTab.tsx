import { useState, useEffect, useCallback } from 'react';
import { Users, AlertCircle, Loader2, RefreshCw, Play, CheckCircle2, Circle, XCircle, ChevronDown, ChevronUp, AlertTriangle, Sparkles } from 'lucide-react';
import { oteService } from '../../services/oteService';
import { CommissionResult, SemaphoreStatus } from '../../types/finance_v2';
import { fmt, cn } from '../../lib/utils';

export function OteTab({ periodMonth }: { periodMonth: string }) {
  const [results, setResults] = useState<(CommissionResult & { user_name?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recalcWarnings, setRecalcWarnings] = useState<string[]>([]);
  const [initSummary, setInitSummary] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'sellers' | 'managers'>('sellers');

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await oteService.getCommissionResults(periodMonth);
      setResults(data);
    } catch (err) {
      setError('Erro ao carregar resultados de comissão.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [periodMonth]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleInitializePeriod = async () => {
    if (!confirm(
      `Isso vai calcular o OTE do período ${periodMonth.substring(0, 7)} para TODOS os colaboradores com perfil ativo.\n\n` +
      `Transações históricas já existentes no banco serão consideradas.\n\nConfirmar?`
    )) return;

    setIsInitializing(true);
    setError(null);
    setRecalcWarnings([]);
    setInitSummary(null);

    try {
      const { calculated, warnings } = await oteService.calculatePeriodFromProfiles(periodMonth);
      setRecalcWarnings(warnings);
      setInitSummary(`✅ ${calculated} colaborador(es) calculado(s) com sucesso para ${periodMonth.substring(0, 7)}.`);
      await loadResults();
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
      const existing = await oteService.getCommissionResults(periodMonth);

      // Busca todos os níveis em paralelo
      const withLevels = await Promise.all(
        existing.map(async r => ({
          r,
          officialLevel: await oteService.getOfficialLevel(r.user_id, r.role_type),
        }))
      );

      // Recalcula todos em paralelo
      const warningArrays = await Promise.all(
        withLevels.map(async ({ r, officialLevel }) => {
          const w: string[] = [];
          if (!officialLevel) {
            w.push(
              `Perfil OTE não configurado para o usuário ${r.user_id.substring(0, 8)}… (${r.role_type}). ` +
              `Acesse Configurações > Perfis OTE e defina o nível antes de recalcular.`
            );
            return w;
          }
          if (r.role_type === 'CLOSER') {
            const ok = await oteService.calculateAndUpsertSellerCommission(r.user_id, periodMonth, officialLevel);
            if (!ok) w.push(`Regra CLOSER para nível "${officialLevel}" não encontrada em commission_rules. Verifique se existe uma regra ativa para este nível.`);
          } else if (r.role_type === 'MANAGER' && r.squad_id) {
            const ok = await oteService.calculateAndUpsertManagerCommission(r.user_id, r.squad_id, periodMonth, officialLevel);
            if (!ok) w.push(`Regra MANAGER para nível "${officialLevel}" não encontrada em commission_rules. Verifique se existe uma regra ativa para este nível.`);
          }
          return w;
        })
      );

      setRecalcWarnings(warningArrays.flat());
      await loadResults();
    } catch (err) {
      setError('Erro ao recalcular OTE. Verifique as regras de comissão cadastradas.');
      console.error(err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const sellers = results.filter(r => r.role_type === 'CLOSER');
  const managers = results.filter(r => r.role_type === 'MANAGER');
  const displayData = activeView === 'sellers' ? sellers : managers;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={loadResults}
          disabled={isLoading}
          className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-colors text-slate-500"
          title="Atualizar"
        >
          <RefreshCw size={18} className={cn(isLoading && 'animate-spin')} />
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleInitializePeriod}
            disabled={isInitializing || isRecalculating || isLoading}
            title="Calcula OTE do zero para todos com perfil ativo, usando transações históricas"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-60"
          >
            {isInitializing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Iniciar Período
          </button>
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating || isInitializing || isLoading}
            title="Recalcula registros OTE já existentes para o período"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-60"
          >
            {isRecalculating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Recalcular OTE
          </button>
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
              {recalcWarnings.length} usuário(s) não puderam ser recalculados:
            </span>
          </div>
          {recalcWarnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-700 pl-6">• {w}</p>
          ))}
        </div>
      )}

      {/* View Selector */}
      <div className="flex gap-3">
        <ViewToggle label={`Vendedores (${sellers.length})`} active={activeView === 'sellers'} onClick={() => setActiveView('sellers')} />
        <ViewToggle label={`Gestores (${managers.length})`} active={activeView === 'managers'} onClick={() => setActiveView('managers')} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Carregando comissionamento...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 p-6">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
            <p className="text-rose-600 font-semibold text-center">{error}</p>
            <button onClick={loadResults} className="mt-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-100">
              Tentar novamente
            </button>
          </div>
        ) : displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-6">
            <Users className="w-16 h-16 text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">Nenhum resultado de OTE para este período.</p>
            <p className="text-slate-400 text-sm mt-1">
              Use o botão "Recalcular OTE do Período" para processar as comissões.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4 font-bold tracking-wider">Vendedor / Gestor</th>
                  <th className="px-5 py-4 font-bold tracking-wider">Nível</th>
                  {activeView === 'managers' && <th className="px-5 py-4 font-bold tracking-wider">Squad</th>}
                  <th className="px-5 py-4 font-bold tracking-wider text-right">Meta</th>
                  <th className="px-5 py-4 font-bold tracking-wider text-right">Realizado</th>
                  <th className="px-5 py-4 font-bold tracking-wider text-center">Atingimento</th>
                  <th className="px-5 py-4 font-bold tracking-wider text-center">Semáforo</th>
                  <th className="px-5 py-4 font-bold tracking-wider text-right">Fixo</th>
                  <th className="px-5 py-4 font-bold tracking-wider text-right">Variável</th>
                  <th className="px-5 py-4 font-bold tracking-wider text-right">Acelerador</th>
                  <th className="px-5 py-4 font-bold tracking-wider text-right">Total OTE</th>
                  <th className="px-5 py-4 font-bold tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayData.map((r) => (
                  <OteRow key={r.id} result={r} showSquad={activeView === 'managers'} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OteRow({ result, showSquad }: { result: CommissionResult & { user_name?: string }; showSquad: boolean }) {
  const achPct = Number(result.achievement_percent) || 0;
  const hasLevel = !!result.level?.trim();

  return (
    <tr className={cn('hover:bg-slate-50/80 transition-colors', !hasLevel && 'bg-amber-50/30')}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-bold text-slate-600">
              {(result.user_name || result.user_id).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{result.user_name || result.user_id.substring(0, 8) + '…'}</p>
              <p className="text-xs text-slate-400">{result.role_type}</p>
            </div>
        </div>
      </td>
      <td className="px-5 py-4">
        {hasLevel ? (
          <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
            {result.level}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
            <AlertTriangle size={11} /> Não definido
          </span>
        )}
      </td>
      {showSquad && (
        <td className="px-5 py-4 text-slate-600 text-sm">
          {result.squad_id ? result.squad_id.substring(0, 8) + '…' : '—'}
        </td>
      )}
      <td className="px-5 py-4 text-right font-medium text-slate-700">R$ {fmt(result.target_revenue)}</td>
      <td className="px-5 py-4 text-right font-medium text-slate-700">R$ {fmt(result.realized_revenue)}</td>
      <td className="px-5 py-4 text-center">
        <AchievementBadge pct={achPct} />
      </td>
      <td className="px-5 py-4 text-center">
        <SemaphoreIndicator status={result.semaphore_status} />
      </td>
      <td className="px-5 py-4 text-right text-slate-700">R$ {fmt(result.fixed_amount)}</td>
      <td className="px-5 py-4 text-right text-slate-700">R$ {fmt(result.variable_amount)}</td>
      <td className="px-5 py-4 text-right text-slate-700">
        {result.accelerator_amount > 0 ? (
          <span className="text-emerald-600 font-bold">+ R$ {fmt(result.accelerator_amount)}</span>
        ) : '—'}
      </td>
      <td className="px-5 py-4 text-right">
        <span className="font-extrabold text-emerald-700 text-base">R$ {fmt(result.total_amount)}</span>
      </td>
      <td className="px-5 py-4 text-center">
        <CommissionStatusBadge status={result.status} />
      </td>
    </tr>
  );
}

function AchievementBadge({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'bg-emerald-100 text-emerald-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold', color)}>
      {pct >= 100 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      {pct.toFixed(1)}%
    </span>
  );
}

function SemaphoreIndicator({ status }: { status: SemaphoreStatus }) {
  const config = {
    GREEN: { color: 'bg-emerald-500', label: 'No alvo' },
    YELLOW: { color: 'bg-amber-400', label: 'Em risco' },
    RED: { color: 'bg-rose-500', label: 'Crítico' },
  };
  const s = config[status];
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={cn('w-3 h-3 rounded-full shadow-sm', s.color)} />
      <span className="text-xs text-slate-500">{s.label}</span>
    </div>
  );
}

function CommissionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string; icon: any }> = {
    TO_PAY: { label: 'A Pagar', cls: 'bg-amber-100 text-amber-700', icon: Circle },
    PAID: { label: 'Paga', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelada', cls: 'bg-slate-100 text-slate-500', icon: XCircle },
  };
  const s = config[status] || config['TO_PAY'];
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold', s.cls)}>
      <Icon size={12} />
      {s.label}
    </span>
  );
}

function ViewToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-5 py-2 rounded-xl text-sm font-bold border-2 transition-all',
        active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
      )}
    >
      {label}
    </button>
  );
}
