import React, { useState, useMemo, useRef } from 'react';
import { TrafficCone, Target, TrendingUp, ChevronDown, User, Users, Share2, Maximize2, Minimize2, Crown } from 'lucide-react';
import { smartShareImage } from '../../lib/shareUtils';
import { fmt } from '../../lib/utils';
import { useSquadStore } from '../../store/useSquadStore';

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
  red: { text: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50', dot: 'bg-red-400', bar: '#ef4444', label: 'Crítico' },
  yellow: { text: 'text-yellow-600', border: 'border-yellow-200', bg: 'bg-yellow-50', dot: 'bg-yellow-400', bar: '#eab308', label: 'Em Risco' },
  green: { text: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50', dot: 'bg-emerald-400', bar: '#10b981', label: 'No Alvo' },
  gold: { text: 'text-yellow-700', border: 'border-yellow-300', bg: 'bg-yellow-100', dot: 'bg-yellow-500', bar: '#ca8a04', label: 'Superou!' },
};

const checkIsManager = (profile: any, squads: any[]) => {
  if (!profile) return false;
  const roleName = profile.cargos?.name ? (profile.cargos.name || '').toUpperCase() : '';
  const deptName = profile.department ? (profile.department || '').toUpperCase() : '';
  return (
    squads.some(sqObj => sqObj.manager_id === profile.id) ||
    ['GESTOR', 'GERENTE', 'DIRETOR', 'COORDENADOR', 'MANAGER', 'LIDER', 'LEAD'].some(k => roleName.includes(k) || deptName.includes(k))
  );
};

const checkIsCapitao = (profile: any, members: any[]) => {
  if (!profile || !members) return false;
  return members.some(m => m.user_id === profile.id && m.role_type === 'capitao');
};

export function SellerSemaphore({ data, currentSellerName, isAdmin, companyRevenueGoal, profiles, getSquadInfoForUser }: SellerSemaphoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { squads, members } = useSquadStore();

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
    const totalValue = data.reduce((acc, c) => acc + c.value, 0);
    const totalCount = data.reduce((acc, c) => acc + c.count, 0);
    const goal = companyRevenueGoal || 1;
    const pct = Math.min((totalReceived / goal) * 100, 100);
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

  // Group sellers by Squad to display aggregate Squad cards
  const squadRows = useMemo(() => {
    const squadsMap: Record<string, {
      name: string;
      received: number;
      value: number;
      count: number;
      revenue_goal: number;
      members: any[];
    }> = {};

    // Pre-initialize all defined squads from useSquadStore to ensure they are always displayed
    squads.forEach(sq => {
      squadsMap[sq.name] = {
        name: sq.name,
        received: 0,
        value: 0,
        count: 0,
        revenue_goal: 0,
        members: []
      };
    });

    data.forEach(s => {
      const p = profiles?.find(pr => (pr.name || '').trim() === s.label.trim());
      const sq = p && getSquadInfoForUser ? getSquadInfoForUser(p.id, s.label, profiles) : null;
      const squadName = sq && sq.name && sq.name !== '—' ? sq.name : 'Outros';

      if (!squadsMap[squadName]) {
        squadsMap[squadName] = {
          name: squadName,
          received: 0,
          value: 0,
          count: 0,
          revenue_goal: 0,
          members: []
        };
      }

      squadsMap[squadName].received += s.received;
      squadsMap[squadName].value += s.value;
      squadsMap[squadName].count += s.count;
      squadsMap[squadName].revenue_goal += s.revenue_goal;
      squadsMap[squadName].members.push(s);
    });

    return Object.values(squadsMap)
      .filter(sq => sq.name !== 'Outros' || sq.received > 0)
      .map(sq => {
        const goal = sq.revenue_goal || 1;
        const pct = Math.min((sq.received / goal) * 100, 100);
        let color: keyof typeof STATUS_CONFIG = 'red';
        if (pct >= 100) color = 'gold';
        else if (pct >= 70) color = 'green';
        else if (pct >= 50) color = 'yellow';

        return {
          label: `Squad ${sq.name}`,
          squadName: sq.name,
          value: sq.value,
          received: sq.received,
          count: sq.count,
          revenue_goal: sq.revenue_goal,
          pct: Math.round(pct),
          color,
          barColor: STATUS_CONFIG[color].bar,
          members: sq.members,
        };
      })
      .sort((a, b) => b.received - a.received);
  }, [data, profiles, getSquadInfoForUser, squads]);

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
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col relative transition-all duration-300 ${isFullscreen ? 'p-12 flex flex-col justify-center min-h-screen overflow-y-auto' : ''
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
          const isCompany = i === 0;
          if (!isCompany) return null;

          const cfg = STATUS_CONFIG[s.color as keyof typeof STATUS_CONFIG];
          const barPct = maxGoal > 0 ? (s.received / maxGoal) * 100 : 0;

          const p = !isCompany ? profiles?.find(pr => (pr.name || '').trim() === s.label.trim()) : null;
          const isManager = !isCompany && checkIsManager(p, squads);
          const isCapitao = !isCompany && checkIsCapitao(p, members);

          return (
            <div
              key={s.label}
              className={`${isCompany
                ? 'pb-4 mb-1 border-b border-slate-100'
                : isManager
                  ? 'p-3 rounded-xl bg-gradient-to-r from-amber-50/80 to-yellow-50/30 border border-amber-200/80 shadow-xs shadow-amber-100/50 my-1'
                  : 'py-1'
                }`}
            >
              {/* Name row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {isCompany ? (
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 flex-shrink-0">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-white flex-shrink-0`} style={{ backgroundColor: isManager ? '#d97706' : cfg.bar }}>
                      {i}
                    </div>
                  )}
                  <span className={`text-sm font-bold truncate flex items-center gap-1.5 ${isCompany ? 'text-slate-800' : 'text-slate-700'}`} title={s.label}>
                    {s.label}
                    {isManager && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] bg-amber-100 text-amber-800 border border-amber-200/60 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 scale-95 origin-left">
                        <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-400" />
                        Gestor
                      </span>
                    )}
                    {isCapitao && !isManager && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] bg-amber-50 text-amber-600 border border-amber-200/60 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 scale-95 origin-left shadow-sm">
                        ©️ Capitão
                      </span>
                    )}
                  </span>

                  {/* Squad badge - single line */}
                  {!isCompany && (() => {
                    const p = profiles?.find(pr => (pr.name || '').trim() === s.label.trim());
                    const sq = p && getSquadInfoForUser ? getSquadInfoForUser(p.id, s.label, profiles) : null;
                    if (!sq || sq.name === '—') return null;
                    
                    const squadObj = squads.find(sqd => sqd.name.toUpperCase() === sq.name.toUpperCase());
                    const sqColor = squadObj?.color || sq.color;
                    
                    return (
                      <span
                        className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0"
                        style={{
                          backgroundColor: sqColor ? `${sqColor}20` : '#f0fdf4',
                          color: sqColor || '#16a34a'
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
              <div className={`relative h-3 rounded-full overflow-hidden ${isManager ? 'bg-amber-100/50' : 'bg-slate-100'}`}>
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(barPct, 100)}%`,
                    background: isManager
                      ? `linear-gradient(90deg, #d97706cc, #d97706)`
                      : `linear-gradient(90deg, ${cfg.bar}cc, ${cfg.bar})`,
                    boxShadow: isManager
                      ? `0 2px 8px rgba(217, 119, 6, 0.3)`
                      : `0 2px 8px ${cfg.bar}44`,
                  }}
                />
                {/* Marker removed */}
              </div>

              {/* Nested Squads Card under Company Total */}
              {isCompany && squadRows.length > 0 && (
                <div className="mt-4 bg-slate-50/60 rounded-xl p-4 border border-slate-100/80 shadow-xs">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desempenho por Squad</h4>
                  </div>
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    {squadRows.map(sq => {
                      const squadObj = squads.find(s => s.name.toUpperCase() === sq.squadName.toUpperCase());
                      const isPluppex = squadObj?.company === 'pluppex' || (!squadObj?.company && sq.squadName.toUpperCase() === 'PLUPPEX');
                      const baseColor = squadObj?.color || (isPluppex ? '#7c3aed' : '#16a34a');
                      const sqCfg = STATUS_CONFIG[sq.color as keyof typeof STATUS_CONFIG];
                      const sqBarPct = sq.pct;
                      return (
                        <div key={sq.label} className="bg-white p-4 rounded-[1.25rem] border border-slate-200 shadow-sm transition-all hover:shadow-md relative overflow-hidden flex flex-col">
                          {/* Fundo colorido translúcido */}
                          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundColor: baseColor }}></div>

                          <div className="relative z-10 flex items-start justify-between mb-3 mt-1">
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0"
                                  style={{
                                    backgroundColor: `${baseColor}15`,
                                    color: baseColor,
                                    border: `1px solid ${baseColor}30`
                                  }}
                                >
                                  {sq.squadName}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[8px] font-black px-1.5 rounded-full border flex-shrink-0 ${sqCfg.text} ${sqCfg.border} ${sqCfg.bg}`}>
                                  <span className={`w-1 h-1 rounded-full ${sqCfg.dot}`} />
                                  {sq.pct}%
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-[11px] text-slate-700 font-bold whitespace-nowrap">
                                  R$ {fmt(sq.received)}
                                </span>
                                <span className="text-[9px] text-slate-400 whitespace-nowrap font-medium">
                                  / R$ {fmt(sq.revenue_goal)}
                                </span>
                              </div>
                            </div>

                            {/* Logo */}
                            {squadObj?.logo_url && (
                              <img
                                src={squadObj.logo_url}
                                alt={`Logo ${sq.squadName}`}
                                className="w-8 h-8 object-contain opacity-90 drop-shadow-sm shrink-0 ml-2"
                              />
                            )}
                          </div>

                          {/* Bar */}
                          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div
                              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${Math.min(sqBarPct, 100)}%`,
                                background: `linear-gradient(90deg, ${sqCfg.bar}cc, ${sqCfg.bar})`,
                              }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[8px] text-slate-400 font-medium mb-3">
                            <span>{sq.count} {sq.count === 1 ? 'ganho' : 'ganhos'}</span>
                            <span>{Math.round(sq.pct)}% da meta</span>
                          </div>

                          {/* Manager Banner */}
                          {(() => {
                            const squadObj = squads.find(s => s.name.toUpperCase() === sq.squadName.toUpperCase());
                            const managerProfile = squadObj && squadObj.manager_id
                              ? profiles?.find(p => p.id === squadObj.manager_id)
                              : null;

                            if (!managerProfile) return null;

                            const managerMember = sq.members.find(m => {
                              const p = profiles?.find(pr => (pr.name || '').trim() === m.label.trim());
                              return p && p.id === managerProfile.id;
                            });

                            return (
                              <div className="flex items-center justify-between p-2.5 rounded-2xl border mb-3 shadow-xxs" style={{ backgroundColor: `${baseColor}0A`, borderColor: `${baseColor}30` }}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-xxs" style={{ backgroundColor: baseColor }}>
                                    <Crown className="w-3.5 h-3.5 fill-white" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: baseColor }}>Gestor do Squad</span>
                                    <span className="text-xs font-bold text-slate-800 truncate">{managerProfile.full_name || managerProfile.name}</span>
                                  </div>
                                </div>

                                {managerMember ? (
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-[10px] font-bold" style={{ color: baseColor }}>R$ {fmt(managerMember.received)}</span>
                                    <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full border" style={{ color: baseColor, backgroundColor: `${baseColor}15`, borderColor: `${baseColor}40` }}>{managerMember.pct}%</span>
                                  </div>
                                ) : (
                                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border" style={{ color: baseColor, backgroundColor: `${baseColor}15`, borderColor: `${baseColor}40` }}>
                                    Liderança
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {/* Members List */}
                          <div className="border-t border-slate-100/80 pt-2.5 mt-2.5">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>Integrantes do Squad</span>
                            </div>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-0.5">
                              {sq.members
                                .sort((a, b) => b.received - a.received)
                                .map(m => {
                                  const mCfg = STATUS_CONFIG[m.color as keyof typeof STATUS_CONFIG];
                                  const overallRank = data.findIndex(d => d.label === m.label) + 1;
                                  const mBarPct = m.pct;

                                  const p = profiles?.find(pr => (pr.name || '').trim() === m.label.trim());
                                  const isManager = checkIsManager(p, squads);
                                  const isCapitao = checkIsCapitao(p, members);

                                  const bgGradient = isManager ? `linear-gradient(to right, ${baseColor}15, ${baseColor}05)` : undefined;

                                  return (
                                    <div
                                      key={m.label}
                                      className={`p-3 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${isManager ? 'shadow-sm' : 'bg-slate-50/40 border-slate-100/60 shadow-xs'}`}
                                      style={isManager ? { background: bgGradient, borderColor: `${baseColor}40` } : {}}
                                    >
                                      {/* Top row */}
                                      <div className="flex items-start justify-between mb-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] text-white flex-shrink-0 shadow-sm"
                                            style={{ backgroundColor: isManager ? baseColor : mCfg.bar }}
                                          >
                                            {overallRank}
                                          </div>
                                          <div className="flex flex-col min-w-0 gap-0.5">
                                            <span className="text-[11px] font-bold text-slate-700 truncate flex items-center gap-1.5" title={m.label}>
                                              {m.label}
                                              {isManager && (
                                                <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0" style={{ color: baseColor, backgroundColor: `${baseColor}1A`, border: `1px solid ${baseColor}40` }}>
                                                  <Crown className="w-2.5 h-2.5" style={{ fill: baseColor }} />
                                                  Gestor
                                                </span>
                                              )}
                                              {isCapitao && !isManager && (
                                                <span className="inline-flex items-center gap-0.5 text-[8px] bg-amber-50 text-amber-600 border border-amber-200/60 font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0 shadow-sm">
                                                  ©️ Capitão
                                                </span>
                                              )}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                              <span className={`inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.2 rounded-full border flex-shrink-0 ${mCfg.text} ${mCfg.border} ${mCfg.bg}`}>
                                                <span className={`w-1 h-1 rounded-full ${mCfg.dot}`} />
                                                {m.pct}%
                                              </span>
                                              <span className="text-[8px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-100 shadow-xxs">
                                                {m.count} {m.count === 1 ? 'ganho' : 'ganhos'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                          <span className="text-[10px] text-slate-700 font-bold whitespace-nowrap">
                                            R$ {fmt(m.received)}
                                          </span>
                                          <span className="text-[8px] text-slate-400 font-medium whitespace-nowrap">
                                            Meta: R$ {fmt(m.revenue_goal)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Progress Bar */}
                                      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isManager ? `${baseColor}20` : '#f1f5f9' }}>
                                        <div
                                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
                                          style={{
                                            width: `${Math.min(mBarPct, 100)}%`,
                                            background: isManager
                                              ? `linear-gradient(90deg, ${baseColor}cc, ${baseColor})`
                                              : `linear-gradient(90deg, ${mCfg.bar}cc, ${mCfg.bar})`,
                                            boxShadow: isManager
                                              ? `0 1px 4px ${baseColor}33`
                                              : `0 1px 4px ${mCfg.bar}33`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
