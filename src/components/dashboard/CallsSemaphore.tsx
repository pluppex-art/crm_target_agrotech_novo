import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Phone, BarChart2, Users, Loader2, Calendar, Share2, Maximize2, Minimize2 } from 'lucide-react';
import { smartShareImage } from '../../lib/shareUtils';
import { callService } from '../../services/callService';

interface SellerCallData {
  user_id: string;
  user_name: string;
  count: number;
  atendidas: number;
  nao_atendidas: number;
  goal: number;
  isVendedor?: boolean;
}

type Period = 'today' | 'week' | 'month' | 'custom';

interface CallsSemaphoreProps {
  goals: any[];
  isAdmin: boolean;
  currentUserId?: string | null;
}

function semaphoreColor(count: number, goal: number): string {
  const pct = goal > 0 ? (count / goal) * 100 : 0;
  if (pct >= 100) return '#eab308';
  if (pct >= 80)  return '#10b981';
  if (pct >= 50)  return '#f59e0b';
  return '#ef4444';
}

function countWorkdays(from: Date, to: Date): number {
  let count = 0;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function getDateRange(period: Period, customStart: string, customEnd: string): { start: string; end: string } {
  const now = new Date();
  if (period === 'today') {
    const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return { start: d, end: d };
  }
  if (period === 'week') {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: fmt(monday), end: fmt(now) };
  }
  if (period === 'month') {
    const y = now.getFullYear(), m = now.getMonth();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: fmt(new Date(y, m, 1)), end: fmt(now) };
  }
  return { start: customStart, end: customEnd };
}

function getPeriodWorkdays(period: Period, customStart: string, customEnd: string): number {
  const now = new Date();
  if (period === 'today') return 1;
  if (period === 'week') {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return countWorkdays(monday, now);
  }
  if (period === 'month') {
    const y = now.getFullYear(), m = now.getMonth();
    return countWorkdays(new Date(y, m, 1), new Date(y, m + 1, 0));
  }
  if (period === 'custom' && customStart && customEnd) {
    return countWorkdays(new Date(customStart), new Date(customEnd));
  }
  return 1;
}

const CHART_HEIGHT = 160;

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  week: 'Semana',
  month: 'Mês',
  custom: 'Período',
};

export function CallsSemaphore({ goals, isAdmin, currentUserId }: CallsSemaphoreProps) {
  const [period, setPeriod] = useState<Period>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [rawData, setRawData] = useState<Omit<SellerCallData, 'goal'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Erro ao alternar tela cheia:", err);
    }
  };

  const handleShareCalls = async () => {
    if (!containerRef.current) return;
    await smartShareImage(containerRef.current, `ligacoes_vendedores_${new Date().toISOString().split('T')[0]}.png`);
  };

  // Fetch only when period/dates change — goals changes don't re-trigger a fetch
  const fetchData = useCallback(async (p: Period, cs: string, ce: string) => {
    const { start, end } = getDateRange(p, cs, ce);
    if (!start || !end) return;
    setLoading(true);
    try {
      const raw = await callService.getTeamRangeStats(start, end);
      setRawData(raw);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period, customStart, customEnd);
  }, [fetchData, period, customStart, customEnd]);

  // Merge goals separately so a goals update doesn't re-fetch
  const sellers: SellerCallData[] = useMemo(() => {
    const sellerGoals = goals.filter((g: any) => g.type === 'seller');
    const companyCallsGoal = goals.find((g: any) => g.type === 'company')?.calls_goal ?? 30;
    return rawData.map(s => {
      const sg = sellerGoals.find((g: any) => g.seller_id === s.user_id);
      return { ...s, goal: sg?.calls_goal ?? companyCallsGoal ?? 30 };
    });
  }, [rawData, goals]);

  const handlePeriod = (p: Period) => {
    if (p === 'custom') { setShowCustom(true); return; }
    setShowCustom(false);
    setPeriod(p);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) { setPeriod('custom'); setShowCustom(false); }
  };

  const base = sellers;
  const visible = !showAll ? base.filter(s => s.isVendedor !== false) : base;

  const workdays = getPeriodWorkdays(period, customStart, customEnd);
  const maxGoal = Math.max(...visible.map(s => s.goal * workdays), 1);
  const maxCount = Math.max(...visible.map(s => s.atendidas), maxGoal, 1);

  return (
    <div 
      ref={containerRef} 
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col relative transition-all duration-300 ${
        isFullscreen ? 'p-12 flex flex-col justify-center min-h-screen overflow-y-auto' : ''
      }`}
    >
      {isFullscreen && (
        <style>{`
          :fullscreen {
            background-color: #ffffff !important;
          }
        `}</style>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-slate-800 ${isFullscreen ? 'text-2xl' : ''}`}>Ligações — Vendedores</h3>
            {loading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-[11px] font-bold border border-slate-200 shadow-sm"
              title={isFullscreen ? "Sair do modo TV" : "Colocar ligações em tela cheia na TV"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {isFullscreen ? 'Sair da TV' : 'Tela Cheia (TV)'}
            </button>
            <button
              onClick={handleShareCalls}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-[11px] font-bold border border-emerald-100 shadow-sm"
              title="Baixar imagem para compartilhar no WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartilhar
            </button>
            <button
              onClick={() => setShowAll(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
                showAll
                  ? 'bg-violet-50 border-violet-200 text-violet-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {showAll ? 'Todos' : 'Vendedores'}
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-100">
              <Phone className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-bold text-blue-600">
                Meta Total: {visible.reduce((acc, s) => acc + (s.goal * workdays), 0)} ({workdays}d úteis)
              </span>
            </div>
          </div>
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            {(['today', 'week', 'month'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => handlePeriod(p)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  period === p && !showCustom
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <button
              onClick={() => handlePeriod('custom')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                period === 'custom' || showCustom
                  ? 'bg-white shadow-sm text-slate-800'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {period === 'custom' && !showCustom
                ? `${customStart.slice(5)} → ${customEnd.slice(5)}`
                : 'Período'}
            </button>
          </div>

          {showCustom && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">De</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Até</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:border-emerald-400"
                />
              </div>
              <button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[11px] font-bold disabled:opacity-40 hover:bg-emerald-600 transition-colors"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-slate-300 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50"
          style={{ height: CHART_HEIGHT + 60 }}
        >
          <BarChart2 className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm font-semibold text-slate-400">Nenhum vendedor encontrado</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto custom-scrollbar pb-2">
            <div
            className="flex items-end justify-around gap-4 min-w-full px-2"
            style={{ height: CHART_HEIGHT + 72 }}
          >
            {visible.map((s) => {
              const periodGoal = s.goal * workdays;
              const atendPctTotal = (s.atendidas / maxCount) * 100;
              const barH = Math.max(atendPctTotal * 0.85, s.count > 0 ? 4 : 0);
              const atendPct = s.count > 0 ? (s.atendidas / s.count) * 100 : 0;
              const naoAtendPct = s.count > 0 ? (s.nao_atendidas / s.count) * 100 : 0;
              const goalLineH = (periodGoal / maxCount) * 100 * 0.85;
              const color = semaphoreColor(s.atendidas, periodGoal);
              const firstName = s.user_name.split(' ')[0];

              return (
                <div
                  key={s.user_id}
                  className="flex flex-col items-center justify-end h-full group"
                  style={{ minWidth: 72, flex: '1 1 0' }}
                >
                  <div className="mb-2 flex flex-col items-center gap-1 opacity-80 group-hover:opacity-100">
                    <span className="text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
                      {s.atendidas}/{periodGoal}
                    </span>
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shadow-sm whitespace-nowrap">
                      {s.count} LIGAÇÕES
                    </span>
                  </div>

                  <div className="relative w-full flex flex-col items-center" style={{ height: `${CHART_HEIGHT}px` }}>
                    <div
                      className="absolute w-full max-w-[44px] border-t-2 border-dashed border-slate-300 z-10"
                      style={{ bottom: `${goalLineH}%` }}
                    />
                    <div
                      className="absolute bottom-0 w-full max-w-[44px] rounded-t-2xl overflow-hidden transition-all duration-500 group-hover:brightness-105"
                      style={{
                        height: `${barH}%`,
                        boxShadow: barH > 0 ? `0 4px 12px ${color}33` : 'none',
                      }}
                    >
                      {s.nao_atendidas > 0 && (
                        <div
                          className="absolute bottom-0 left-0 right-0"
                          style={{ height: `${naoAtendPct}%`, background: 'linear-gradient(to top, #ef4444, #f87171)' }}
                        />
                      )}
                      {s.atendidas > 0 && (
                        <div
                          className="absolute left-0 right-0"
                          style={{ bottom: `${naoAtendPct}%`, height: `${atendPct}%`, background: 'linear-gradient(to top, #10b981, #34d399)' }}
                        />
                      )}
                      <div className="absolute inset-x-0 top-0 h-1/3 bg-white/10 rounded-t-2xl pointer-events-none" />
                    </div>
                    <div className="absolute bottom-0 w-full max-w-[44px] h-[2px] bg-slate-100 rounded-full" />
                  </div>

                  <div className="mt-1 flex gap-1.5 justify-center">
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      ✓{s.atendidas}
                    </span>
                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                      ✗{s.nao_atendidas}
                    </span>
                  </div>

                  <div className="mt-1.5 text-center w-full px-1">
                    <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tight group-hover:text-slate-800 transition-colors" title={s.user_name}>
                      {firstName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-[1px] w-full bg-slate-100 mt-1" />
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
        {[
          { label: 'Atendidas',     color: '#10b981' },
          { label: 'Não atendidas', color: '#ef4444' },
          { label: 'Meta',          color: '#94a3b8', dashed: true },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            {item.dashed
              ? <span className="w-5 border-t-2 border-dashed" style={{ borderColor: item.color }} />
              : <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            }
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
