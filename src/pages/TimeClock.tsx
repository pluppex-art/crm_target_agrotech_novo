import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
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
  Filter,
  Download,
  MoreVertical,
  ExternalLink,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileStore } from '../store/useProfileStore';

interface TimeLog {
  id: string;
  user_id: string;
  user_name?: string;
  user_department?: string;
  type: 'entrada' | 'saida_intervalo' | 'volta_intervalo' | 'saida';
  timestamp: string;
  notes?: string;
  location?: string;
}

export function TimeClock() {
  const { user } = useAuthStore();
  const { profiles } = useProfileStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [activeStatus, setActiveStatus] = useState<'off' | 'working' | 'break'>('off');
  const [view, setView] = useState<'personal' | 'admin'>('personal');
  const [searchTerm, setSearchTerm] = useState('');
  
  const profile = profiles.find(p => p.id === user?.id);
  const isAdmin = profile?.cargos?.permissions?.includes('admin.all') || profile?.department === 'Diretoria';

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulating fetching logs
  useEffect(() => {
    const mockLogs: TimeLog[] = [
      { id: '1', user_id: user?.id || '1', user_name: 'Gustavo', user_department: 'Comercial', type: 'entrada', timestamp: new Date(new Date().setHours(8, 0)).toISOString(), location: 'Sede' },
      { id: '2', user_id: user?.id || '1', user_name: 'Gustavo', user_department: 'Comercial', type: 'saida_intervalo', timestamp: new Date(new Date().setHours(12, 0)).toISOString(), location: 'Sede' },
      { id: '3', user_id: user?.id || '1', user_name: 'Gustavo', user_department: 'Comercial', type: 'volta_intervalo', timestamp: new Date(new Date().setHours(13, 0)).toISOString(), location: 'Sede' },
      { id: '4', user_id: '2', user_name: 'Ana Silva', user_department: 'Marketing', type: 'entrada', timestamp: new Date(new Date().setHours(9, 15)).toISOString(), location: 'Home Office' },
      { id: '5', user_id: '3', user_name: 'Carlos Santos', user_department: 'Comercial', type: 'entrada', timestamp: new Date(new Date().setHours(8, 0)).toISOString(), location: 'Sede' },
    ];
    setLogs(mockLogs);
  }, [user?.id]);

  const handlePunch = (type: TimeLog['type']) => {
    const newLog: TimeLog = {
      id: Math.random().toString(36).substring(7),
      user_id: user?.id || '1',
      user_name: profile?.name || 'Eu',
      type,
      timestamp: new Date().toISOString(),
      location: 'Sede'
    };
    
    setLogs(prev => [newLog, ...prev]);
    
    if (type === 'entrada' || type === 'volta_intervalo') setActiveStatus('working');
    else if (type === 'saida_intervalo') setActiveStatus('break');
    else setActiveStatus('off');
  };

  const getStatusColor = () => {
    switch (activeStatus) {
      case 'working': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'break': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const filteredLogs = useMemo(() => {
    if (view === 'personal') return logs.filter(l => l.user_id === user?.id);
    return logs.filter(l => 
      l.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.user_department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, view, user?.id, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* View Toggle (Admin Only) */}
      {isAdmin && (
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-4 border border-slate-200 shadow-inner">
          <button 
            onClick={() => setView('personal')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              view === 'personal' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Meu Ponto
          </button>
          <button 
            onClick={() => setView('admin')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              view === 'admin' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Users size={16} />
            Gestão da Equipe
          </button>
        </div>
      )}

      {view === 'personal' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header Section */}
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
                <div className={cn("w-2 h-2 rounded-full animate-pulse", activeStatus === 'working' ? 'bg-emerald-500' : activeStatus === 'break' ? 'bg-amber-500' : 'bg-slate-400')} />
                {activeStatus === 'working' ? 'Em Jornada' : activeStatus === 'break' ? 'Em Intervalo' : 'Fora de Jornada'}
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
                  <PunchButton 
                    label="Registrar Entrada" 
                    icon={Play} 
                    onClick={() => handlePunch('entrada')} 
                    active={activeStatus === 'off'}
                    variant="emerald"
                  />
                  <PunchButton 
                    label="Saída Intervalo" 
                    icon={Coffee} 
                    onClick={() => handlePunch('saida_intervalo')} 
                    active={activeStatus === 'working'}
                    variant="amber"
                  />
                  <PunchButton 
                    label="Retorno Intervalo" 
                    icon={ArrowRight} 
                    onClick={() => handlePunch('volta_intervalo')} 
                    active={activeStatus === 'break'}
                    variant="indigo"
                  />
                  <PunchButton 
                    label="Registrar Saída" 
                    icon={Square} 
                    onClick={() => handlePunch('saida')} 
                    active={activeStatus === 'working'}
                    variant="red"
                  />
                </div>

                <div className="pt-6 border-t border-slate-50 grid grid-cols-3 gap-4">
                  <MetricCard label="Entrada" value="08:00" icon={<Play size={14} />} />
                  <MetricCard label="Total Hoje" value="05:42" icon={<Clock size={14} />} color="text-emerald-600" />
                  <MetricCard label="Previsão Saída" value="18:00" icon={<Square size={14} />} />
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
                <button className="text-sm font-bold bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors">
                  Ver Mapa
                </button>
              </div>
            </div>

            {/* History Log */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                <History size={20} className="text-emerald-600" />
                Histórico Hoje
              </h3>

              <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 last:border-transparent pb-6 last:pb-0">
                    <div className={cn(
                      "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm",
                      log.type === 'entrada' ? 'bg-emerald-500' : 
                      log.type === 'saida' ? 'bg-red-500' :
                      log.type === 'saida_intervalo' ? 'bg-amber-500' : 'bg-indigo-500'
                    )} />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-800 capitalize">
                          {log.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Confirmado por IP/GPS</p>
                      </div>
                      <span className="text-sm font-black text-slate-700 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-center opacity-30">
                    <AlertCircle size={48} className="mb-4" />
                    <p className="text-sm font-medium">Nenhum registro hoje</p>
                  </div>
                )}
              </div>

              <button className="w-full mt-8 py-3 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all border border-slate-100">
                Ver Relatório Mensal
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Admin Stats Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AdminStatCard label="Presentes" value="12" sub="Trabalhando agora" color="text-emerald-600" icon={<Play size={18}/>} />
            <AdminStatCard label="Em Intervalo" value="3" sub="Retorno previsto em 30min" color="text-amber-600" icon={<Coffee size={18}/>} />
            <AdminStatCard label="Atrasos" value="1" sub="Hoje" color="text-red-600" icon={<AlertCircle size={18}/>} />
            <AdminStatCard label="Total Colaboradores" value="16" sub="Cadastrados" color="text-slate-600" icon={<Users size={18}/>} />
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                  <Filter size={16} />
                  Filtros
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 shadow-sm transition-all">
                  <Download size={16} />
                  Relatório PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4 text-left">Colaborador</th>
                    <th className="px-6 py-4 text-left">Departamento</th>
                    <th className="px-6 py-4 text-left">Tipo</th>
                    <th className="px-6 py-4 text-left">Horário</th>
                    <th className="px-6 py-4 text-left">Localização</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">
                            {log.user_name?.substring(0, 2)}
                          </div>
                          <span className="font-bold text-slate-700">{log.user_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                          {log.user_department}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            log.type === 'entrada' ? 'bg-emerald-500' : 
                            log.type === 'saida' ? 'bg-red-500' :
                            log.type === 'saida_intervalo' ? 'bg-amber-500' : 'bg-indigo-500'
                          )} />
                          <span className="capitalize font-medium text-slate-600">{log.type.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-700 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <MapPin size={12} />
                          {log.location}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                          <ExternalLink size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 bg-slate-50 text-center">
              <button className="text-xs font-bold text-emerald-600 hover:underline">Ver todos os registros históricos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PunchButton({ label, icon: Icon, onClick, active, variant }: { 
  label: string; icon: any; onClick: () => void; active: boolean;
  variant: 'emerald' | 'amber' | 'red' | 'indigo'
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
      disabled={!active}
      className={cn(
        "flex items-center justify-center gap-3 p-4 rounded-2xl transition-all duration-300 font-bold text-sm border-b-4",
        active ? colors[variant] : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50 grayscale shadow-none"
      )}
    >
      <Icon size={20} />
      {label}
    </button>
  );
}

function MetricCard({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color?: string }) {
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

function AdminStatCard({ label, value, sub, color, icon }: { label: string, value: string, sub: string, color: string, icon: React.ReactNode }) {
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
