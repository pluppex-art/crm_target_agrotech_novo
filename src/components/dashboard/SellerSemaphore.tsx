import React, { useState, useMemo, useRef } from 'react';
import { TrafficCone, Target, TrendingUp, ChevronDown, User, Share2, Maximize2, Minimize2 } from 'lucide-react';
import { smartShareImage } from '../../lib/shareUtils';
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
  profiles?: any[];
  getSquadInfoForUser?: (userId: string, userName: string, profilesList: any[]) => { name: string; color: string };
}

const STATUS_CONFIG = {
  red:    { text: 'text-red-600',     border: 'border-red-200',     bg: 'bg-red-50',     dot: 'bg-red-400',     bar: '#ef4444', label: 'Crítico' },
  yellow: { text: 'text-amber-600',   border: 'border-amber-200',   bg: 'bg-amber-50',   dot: 'bg-amber-400',   bar: '#f59e0b', label: 'Em Risco' },
  green:  { text: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50', dot: 'bg-emerald-400', bar: '#10b981', label: 'No Alvo' },
  gold:   { text: 'text-yellow-600',  border: 'border-yellow-200',  bg: 'bg-yellow-50',  dot: 'bg-yellow-400',  bar: '#eab308', label: 'Superou!' },
};

export function SellerSemaphore({ data, currentSellerName, isAdmin, companyRevenueGoal, profiles, getSquadInfoForUser }: SellerSemaphoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  React.useEffect(() => {
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

  const handleShare = async () => {
    if (!containerRef.current) return;
    await smartShareImage(containerRef.current, `semaforo_vendedores_${new Date().toISOString().split('T')[0]}.png`);
  };

  // Build company-level total row
  const companyRow = useMemo(() => {
    const totalReceived = data.reduce((acc, c) => acc + c.received, 0);
    const totalValue    = data.reduce((acc, c) => acc + c.value, 0);
    const totalCount    = data.reduce((acc, c) => acc + c.count, 0);
    const goal = companyRevenueGoal || 1;
    const pct  = Math.min((totalReceived / goal) * 100, 100);
    let color: keyof typeof STATUS_CONFIG = 'red';
    if (pct >= 100) color = 'gold';
    else if (pct >= 70) color = 'green';
    else if (pct >= 50) color = 'yellow';
    return {
      label: 'Total da Empresa',
      value: totalValue,
      received: totalReceived,
      count: totalCount,
      percentage: pct,
      revenue_goal: companyRevenueGoal || 0,
      pct: Math.round(pct),
      color,
      colorClass: '',
      barColor: STATUS_CONFIG[color].bar,
    };
  }, [data, companyRevenueGoal]);

  // Rows to render: company summary + individual sellers
  const rows = useMemo(() => [companyRow, ...data], [companyRow, data]);
  const maxGoal = Math.max(...rows.map(r => r.revenue_goal), 1);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrafficCone className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-800">Semáforo de Receita</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-slate-300">
          <Target className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-xs font-medium">Nenhum vendedor disponível</p>
        </div>
      </div>
    );
  }

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
      <div className="flex items-center justify-between mb-5">
        <h3 className={`font-bold text-slate-800 ${isFullscreen ? 'text-2xl' : ''}`}>Semáforo de Receita</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-xs font-bold border border-slate-200 shadow-sm"
            title={isFullscreen ? "Sair do modo TV" : "Colocar semáforo em tela cheia na TV"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? 'Sair da TV' : 'Tela Cheia (TV)'}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-semibold border border-emerald-100 shadow-sm"
            title="Baixar imagem para compartilhar no WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            Compartilhar
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-4 flex-1">
        {rows.map((s, i) => {
          const cfg = STATUS_CONFIG[s.color as keyof typeof STATUS_CONFIG];
          const isCompany = i === 0;
          const barPct = maxGoal > 0 ? (s.received / maxGoal) * 100 : 0;

          return (
            <div key={s.label} className={`${isCompany ? 'pb-4 mb-1 border-b border-slate-100' : ''}`}>
              {/* Name row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {isCompany ? (
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 flex-shrink-0">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-white flex-shrink-0`} style={{ backgroundColor: cfg.bar }}>
                      {i}
                    </div>
                  )}
                  <span className={`text-sm font-bold truncate ${isCompany ? 'text-slate-800' : 'text-slate-700'}`} title={s.label}>
                    {s.label}
                  </span>
                  
                  {/* Squad badge - single line */}
                  {!isCompany && (() => {
                    const p = profiles?.find(pr => (pr.name || '').trim() === s.label.trim());
                    const sq = p && getSquadInfoForUser ? getSquadInfoForUser(p.id, s.label, profiles) : null;
                    if (!sq || sq.name === '—') return null;
                    return (
                      <span
                        className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0"
                        style={{
                          backgroundColor: sq.name.toUpperCase() === 'PLUPPEX' ? '#f5f3ff' : '#f0fdf4',
                          color: sq.name.toUpperCase() === 'PLUPPEX' ? '#7c3aed' : '#16a34a'
                        }}
                      >
                        {sq.name}
                      </span>
                    );
                  })()}

                  <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border flex-shrink-0 ${cfg.text} ${cfg.border} ${cfg.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {s.pct}%
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    R$ {fmt(s.received)} / R$ {fmt(s.revenue_goal)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 whitespace-nowrap">
                    {s.count} {s.count === 1 ? 'ganho' : 'ganhos'}
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(barPct, 100)}%`,
                    background: `linear-gradient(90deg, ${cfg.bar}cc, ${cfg.bar})`,
                    boxShadow: `0 2px 8px ${cfg.bar}44`,
                  }}
                />
                {/* Goal marker at 100% of this seller's goal */}
                {s.revenue_goal > 0 && maxGoal > 0 && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-slate-400/40"
                    style={{ left: `${(s.revenue_goal / maxGoal) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
