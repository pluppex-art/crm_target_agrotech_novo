import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Square,
  Calendar as CalendarIcon,
  History,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Briefcase,
  ArrowRight,
  Users,
  Search,
  Download,
  MapPin,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileStore } from '../store/useProfileStore';
import { useTimeClockStore } from '../store/useTimeClockStore';
import { timeClockService, TimeClockRecordWithProfile } from '../services/timeClockService';
import type { PontoStatus } from '../store/useTimeClockStore';

const TYPE_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  saida_intervalo: 'Saída Intervalo',
  volta_intervalo: 'Retorno Intervalo',
  saida: 'Saída Final',
};

const TYPE_COLOR: Record<string, string> = {
  entrada: 'bg-emerald-500',
  saida: 'bg-red-500',
  saida_intervalo: 'bg-amber-500',
  volta_intervalo: 'bg-indigo-500',
};

export function TimeClock() {
  const { user } = useAuthStore();
  const { profiles } = useProfileStore();
  const { status: activeStatus, todayRecords, loading, syncFromDb, punch } = useTimeClockStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [view, setView] = useState<'personal' | 'admin'>('personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [teamData, setTeamData] = useState<Awaited<ReturnType<typeof timeClockService.getTeamStatusToday>>>([]);
  const [allTodayRecords, setAllTodayRecords] = useState<TimeClockRecordWithProfile[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [punching, setPunching] = useState(false);

  const profile = profiles.find(p => p.id === user?.id);
  const isAdmin = profile?.cargos?.permissions?.includes('admin.all') || profile?.department === 'Diretoria';

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync personal records from DB on mount
  useEffect(() => {
    if (user?.id) syncFromDb(user.id);
  }, [user?.id]);

  // Fetch admin data when switching to admin view
  useEffect(() => {
    if (view !== 'admin' || !isAdmin) return;
    setTeamLoading(true);
    Promise.all([
      timeClockService.getTeamStatusToday(),
      timeClockService.getAllTodayRecords(),
    ]).then(([team, records]) => {
      setTeamData(team);
      setAllTodayRecords(records);
    }).catch(console.error).finally(() => setTeamLoading(false));
  }, [view, isAdmin]);

  const handlePunch = async (type: 'entrada' | 'saida_intervalo' | 'volta_intervalo' | 'saida') => {
    if (!user?.id || punching) return;
    setPunching(true);
    try {
      await punch(user.id, type);
    } catch (err) {
      console.error('Erro ao registrar ponto:', err);
      alert('Erro ao registrar ponto. Tente novamente.');
    } finally {
      setPunching(false);
    }
  };

  const getStatusColor = () => {
    if (activeStatus === 'working' || activeStatus === 'returned') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (activeStatus === 'break') return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-slate-400 bg-slate-50 border-slate-100';
  };

  const statusLabel = (s: PontoStatus) => {
    if (s === 'working' || s === 'returned') return 'Em Jornada';
    if (s === 'break') return 'Em Intervalo';
    return 'Fora de Jornada';
  };

  // Compute today's metrics
  const todayMetrics = useMemo(() => {
    const entrada = todayRecords.find(r => r.type === 'entrada');
    const saida = [...todayRecords].reverse().find(r => r.type === 'saida');

    let totalMs = 0;
    let workStart: Date | null = null;

    for (const rec of todayRecords) {
      const t = new Date(rec.timestamp);
      if (rec.type === 'entrada' || rec.type === 'volta_intervalo') {
        workStart = t;
      } else if (rec.type === 'saida_intervalo') {
        if (workStart) totalMs += t.getTime() - workStart.getTime();
        workStart = null;
      } else if (rec.type === 'saida') {
        if (workStart) totalMs += t.getTime() - workStart.getTime();
        workStart = null;
      }
    }
    if (workStart) totalMs += Date.now() - workStart.getTime();

    const totalH = Math.floor(totalMs / 3600000);
    const totalM = Math.floor((totalMs % 3600000) / 60000);

    return {
      entrada: entrada ? new Date(entrada.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
      saida: saida ? new Date(saida.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
      total: `${String(totalH).padStart(2, '0')}:${String(totalM).padStart(2, '0')}`,
    };
  }, [todayRecords, activeStatus, currentTime]);

  // Admin stats
  const adminStats = useMemo(() => ({
    working: teamData.filter(t => t.status === 'working' || t.status === 'returned').length,
    onBreak: teamData.filter(t => t.status === 'break').length,
    absent: teamData.filter(t => t.status === 'off').length,
    total: teamData.length,
  }), [teamData]);

  const filteredTeam = useMemo(() => {
    if (!searchTerm) return teamData;
    const lower = searchTerm.toLowerCase();
    return teamData.filter(t =>
      t.user_name.toLowerCase().includes(lower) ||
      (t.user_department || '').toLowerCase().includes(lower)
    );
  }, [teamData, searchTerm]);

  const filteredAllRecords = useMemo(() => {
    if (!searchTerm) return allTodayRecords;
    const lower = searchTerm.toLowerCase();
    return allTodayRecords.filter(r =>
      r.user_name.toLowerCase().includes(lower) ||
      (r.user_department || '').toLowerCase().includes(lower)
    );
  }, [allTodayRecords, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {isAdmin && (
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-4 border border-slate-200 shadow-inner">
          <button
            onClick={() => setView('personal')}
            className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", view === 'personal' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            Meu Ponto
          </button>
          <button
            onClick={() => setView('admin')}
            className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", view === 'admin' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <Users size={16} />
            Gestão da Equipe
          </button>
        </div>
      )}

      {view === 'personal' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                <Clock className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Horário de Ponto</h1>
                <p className="text-slate-500 flex items-center gap-2 mt-1">
                  <CalendarIcon size={14} />
                  {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-slate-800 tabular-nums tracking-tight">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mt-3 border transition-all uppercase tracking-widest", getStatusColor())}>
                <div className={cn("w-2 h-2 rounded-full animate-pulse",
                  (activeStatus === 'working' || activeStatus === 'returned') ? 'bg-emerald-500' :
                  activeStatus === 'break' ? 'bg-amber-500' : 'bg-slate-400'
                )} />
                {statusLabel(activeStatus)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Punch Controls */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase size={20} className="text-emerald-600" />
                  Controle de Jornada
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PunchButton label="Registrar Entrada" icon={punching ? Loader2 : Play} onClick={() => handlePunch('entrada')} active={activeStatus === 'off'} variant="emerald" spinning={punching} />
                  <PunchButton label="Saída Intervalo" icon={punching ? Loader2 : Coffee} onClick={() => handlePunch('saida_intervalo')} active={activeStatus === 'working' || activeStatus === 'returned'} variant="amber" spinning={punching} />
                  <PunchButton label="Retorno Intervalo" icon={punching ? Loader2 : ArrowRight} onClick={() => handlePunch('volta_intervalo')} active={activeStatus === 'break'} variant="indigo" spinning={punching} />
                  <PunchButton label="Registrar Saída" icon={punching ? Loader2 : Square} onClick={() => handlePunch('saida')} active={activeStatus === 'working' || activeStatus === 'returned'} variant="red" spinning={punching} />
                </div>
                <div className="pt-6 border-t border-slate-50 grid grid-cols-3 gap-4">
                  <MetricCard label="Entrada" value={todayMetrics.entrada} icon={<Play size={14} />} />
                  <MetricCard label="Total Hoje" value={loading ? '...' : todayMetrics.total} icon={<Clock size={14} />} color="text-emerald-600" />
                  <MetricCard label="Saída Prevista" value={todayMetrics.saida !== '--:--' ? todayMetrics.saida : '--:--'} icon={<Square size={14} />} />
                </div>
              </div>

              <div className="bg-emerald-600 p-6 rounded-3xl text-white flex items-center justify-between shadow-lg shadow-emerald-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <CheckCircle2 />
                  </div>
                  <div>
                    <p className="font-bold">Localização Identificada</p>
                    <p className="text-sm text-emerald-100 opacity-80">Sede Target Agrotech — Cuiabá, MT</p>
                  </div>
                </div>
              </div>
            </div>

            {/* History Log */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                <History size={20} className="text-emerald-600" />
                Histórico Hoje
              </h3>
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                  {todayRecords.map((log) => (
                    <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 last:border-transparent pb-6 last:pb-0">
                      <div className={cn("absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm", TYPE_COLOR[log.type] || 'bg-slate-400')} />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{TYPE_LABEL[log.type] || log.type}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{log.location || 'Sede'}</p>
                        </div>
                        <span className="text-sm font-black text-slate-700 tabular-nums">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {todayRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-center opacity-30">
                      <AlertCircle size={48} className="mb-4" />
                      <p className="text-sm font-medium">Nenhum registro hoje</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AdminStatCard label="Presentes" value={String(adminStats.working)} sub="Trabalhando agora" color="text-emerald-600" icon={<Play size={18}/>} />
            <AdminStatCard label="Em Intervalo" value={String(adminStats.onBreak)} sub="Fora temporariamente" color="text-amber-600" icon={<Coffee size={18}/>} />
            <AdminStatCard label="Ausentes" value={String(adminStats.absent)} sub="Sem registro hoje" color="text-red-600" icon={<AlertCircle size={18}/>} />
            <AdminStatCard label="Total Colaboradores" value={String(adminStats.total)} sub="Ativos no sistema" color="text-slate-600" icon={<Users size={18}/>} />
          </div>

          {/* Status por colaborador */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base font-bold text-slate-700">Status da Equipe — Hoje</h3>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar colaborador ou departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            {teamLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4 text-left">Colaborador</th>
                      <th className="px-6 py-4 text-left">Departamento</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-left">Último Registro</th>
                      <th className="px-6 py-4 text-left">Horário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTeam.map((member) => (
                      <tr key={member.user_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {member.user_avatar ? (
                              <img src={member.user_avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">
                                {member.user_name.substring(0, 2)}
                              </div>
                            )}
                            <span className="font-bold text-slate-700">{member.user_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {member.user_department ? (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                              {member.user_department}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={member.status} />
                        </td>
                        <td className="px-6 py-4">
                          {member.last_record ? (
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", TYPE_COLOR[member.last_record.type] || 'bg-slate-400')} />
                              <span className="text-slate-600">{TYPE_LABEL[member.last_record.type]}</span>
                            </div>
                          ) : <span className="text-slate-300 text-xs">Sem registro</span>}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-700 tabular-nums">
                          {member.last_record
                            ? new Date(member.last_record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTeam.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-30">
                    <Users size={40} className="mb-3" />
                    <p className="text-sm font-medium">Nenhum colaborador encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Log de registros do dia */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
                <History size={18} className="text-emerald-600" />
                Todos os Registros de Hoje
              </h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 shadow-sm transition-all">
                <Download size={16} />
                Exportar
              </button>
            </div>
            {teamLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4 text-left">Colaborador</th>
                      <th className="px-6 py-4 text-left">Departamento</th>
                      <th className="px-6 py-4 text-left">Tipo</th>
                      <th className="px-6 py-4 text-left">Horário</th>
                      <th className="px-6 py-4 text-left">Localização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredAllRecords.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {log.user_avatar ? (
                              <img src={log.user_avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] uppercase">
                                {log.user_name.substring(0, 2)}
                              </div>
                            )}
                            <span className="font-bold text-slate-700">{log.user_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {log.user_department ? (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                              {log.user_department}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", TYPE_COLOR[log.type] || 'bg-slate-400')} />
                            <span className="capitalize font-medium text-slate-600">{TYPE_LABEL[log.type]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-700 tabular-nums">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <MapPin size={12} />
                            {log.location || 'Sede'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAllRecords.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                    <AlertCircle size={36} className="mb-2" />
                    <p className="text-sm font-medium">Nenhum registro hoje</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PontoStatus }) {
  if (status === 'working' || status === 'returned')
    return <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Em Jornada</span>;
  if (status === 'break')
    return <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Em Intervalo</span>;
  return <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Ausente</span>;
}

function PunchButton({ label, icon: Icon, onClick, active, variant, spinning }: {
  label: string; icon: any; onClick: () => void; active: boolean;
  variant: 'emerald' | 'amber' | 'red' | 'indigo'; spinning?: boolean;
}) {
  const colors = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 text-white',
    amber: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 text-white',
    red: 'bg-red-500 hover:bg-red-600 shadow-red-200 text-white',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={!active || spinning}
      className={cn(
        "flex items-center justify-center gap-3 p-4 rounded-2xl transition-all duration-300 font-bold text-sm border-b-4",
        active && !spinning ? colors[variant] : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50 grayscale shadow-none"
      )}
    >
      <Icon size={20} className={spinning ? 'animate-spin' : ''} />
      {label}
    </button>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="text-center p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
        {icon}
        {label}
      </div>
      <div className={cn("text-lg font-black tabular-nums", color || "text-slate-700")}>{value}</div>
    </div>
  );
}

function AdminStatCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50", color)}>
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn("text-2xl font-black tabular-nums", color)}>{value}</div>
      <div className="text-[10px] text-slate-400 mt-1 font-medium">{sub}</div>
    </div>
  );
}
