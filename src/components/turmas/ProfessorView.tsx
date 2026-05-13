import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ArrowLeft,
  Search,
  BadgeCheck,
  UserCheck,
  AlertCircle,
  Filter,
  MoreVertical,
  Check,
  X
} from 'lucide-react';
import { Turma, TurmaAttendee, AttendanceStatus, useTurmaStore } from '../../store/useTurmaStore';
import { cn } from '../../lib/utils';
import { UserProfile } from '../../services/profileService';

interface ProfessorViewProps {
  turmas: Turma[];
  onSelectTurma?: (turma: Turma | null) => void;
  currentUserProfile?: UserProfile;
}

type StudentFilter = 'all' | 'confirmado' | 'cancelado' | 'pendente';

export function ProfessorView({ turmas, onSelectTurma, currentUserProfile }: ProfessorViewProps) {
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);
  const [studentFilter, setStudentFilter] = useState<StudentFilter>('all');
  const { updateAttendeeStatus } = useTurmaStore();

  const filteredTurmas = turmas.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (t.professor_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (onlyMine && currentUserProfile?.name) {
      return matchesSearch && (t.professor_name?.toLowerCase() === currentUserProfile.name.toLowerCase());
    }
    
    return matchesSearch;
  }).sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());

  const handleBack = () => {
    setSelectedTurma(null);
    if (onSelectTurma) onSelectTurma(null);
  };

  const handleTurmaClick = (turma: Turma) => {
    setSelectedTurma(turma);
    if (onSelectTurma) onSelectTurma(turma);
  };

  const handleStatusChange = async (turmaId: string, attendeeId: string, status: AttendanceStatus) => {
    await updateAttendeeStatus(turmaId, attendeeId, status);
  };

  if (selectedTurma) {
    const attendees = selectedTurma.attendees || [];
    const confirmedCount = attendees.filter(a => a.status === 'confirmado').length;
    const absentCount = attendees.filter(a => a.status === 'cancelado').length;
    const pendingCount = attendees.length - confirmedCount - absentCount;
    
    const progress = attendees.length > 0 ? (confirmedCount / attendees.length) * 100 : 0;

    const filteredAttendees = attendees.filter(a => {
      if (studentFilter === 'all') return true;
      if (studentFilter === 'confirmado') return a.status === 'confirmado';
      if (studentFilter === 'cancelado') return a.status === 'cancelado';
      if (studentFilter === 'pendente') return a.status === 'matriculado' || a.status === 'indeciso';
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="flex flex-col h-full bg-[#f8fafc]">
        {/* Header Superior - Turma Selecionada */}
        <div className="bg-white border-b border-slate-200/50 shrink-0">
          <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleBack}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 transition-all active:scale-95 shrink-0"
              >
                <ArrowLeft size={22} />
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-slate-800 truncate tracking-tight leading-none mb-1.5">{selectedTurma.name}</h2>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-emerald-500" />
                        {selectedTurma.date ? new Date(selectedTurma.date.replace(/-/g, '\/')).toLocaleDateString('pt-BR') : '--'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-emerald-500" />
                        {selectedTurma.time || '--:--'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className="flex items-baseline justify-end gap-1.5">
                      <span className="text-3xl font-black text-emerald-600 leading-none">{confirmedCount}</span>
                      <span className="text-xs font-bold text-slate-300">/ {attendees.length}</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Presentes</span>
                  </div>
                </div>
                
                <div className="mt-4 relative">
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto mt-4 pb-1 no-scrollbar">
              {[
                { id: 'all', label: 'Todos', count: attendees.length, color: 'text-slate-600 bg-slate-100' },
                { id: 'confirmado', label: 'Presentes', count: confirmedCount, color: 'text-emerald-600 bg-emerald-50' },
                { id: 'cancelado', label: 'Ausentes', count: absentCount, color: 'text-red-600 bg-red-50' },
                { id: 'pendente', label: 'Pendentes', count: pendingCount, color: 'text-amber-600 bg-amber-50' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStudentFilter(f.id as StudentFilter)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border border-transparent tracking-tight whitespace-nowrap",
                    studentFilter === f.id 
                      ? `${f.color} shadow-sm ring-1 ring-black/5` 
                      : "bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {f.label.toUpperCase()}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9px] min-w-[18px] text-center",
                    studentFilter === f.id ? "bg-white/50" : "bg-slate-100"
                  )}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-2">
            {filteredAttendees.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <Users size={48} className="mx-auto mb-4 opacity-10" />
                <p className="text-slate-400 font-medium">Nenhum aluno nesta categoria.</p>
              </div>
            ) : (
              filteredAttendees.map(attendee => (
                <div 
                  key={attendee.id}
                  className={cn(
                    "flex items-center gap-3 p-3 bg-white rounded-2xl border transition-all",
                    attendee.status === 'confirmado' ? "border-emerald-100 bg-emerald-50/20" : 
                    attendee.status === 'cancelado' ? "border-red-100 bg-red-50/10 opacity-75" : "border-slate-100"
                  )}
                >
                  <div className="relative shrink-0">
                    <img 
                      src={attendee.photo} 
                      alt={attendee.name} 
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    {attendee.status === 'confirmado' && (
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                    {attendee.status === 'cancelado' && (
                      <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                        <X size={8} strokeWidth={4} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm truncate">{attendee.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {attendee.status === 'confirmado' ? (
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Presente</span>
                      ) : attendee.status === 'cancelado' ? (
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Ausente</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pendente</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 min-w-[88px] justify-end">
                    <AnimatePresence mode="wait">
                      {attendee.status === 'matriculado' || attendee.status === 'indeciso' ? (
                        <motion.div 
                          key="actions"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center gap-1.5"
                        >
                          <button
                            onClick={() => handleStatusChange(selectedTurma.id, attendee.id, 'confirmado')}
                            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center justify-center"
                            title="Marcar Presença"
                          >
                            <Check size={20} strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(selectedTurma.id, attendee.id, 'cancelado')}
                            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center"
                            title="Marcar Falta"
                          >
                            <X size={20} strokeWidth={3} />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="reset"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => handleStatusChange(selectedTurma.id, attendee.id, 'matriculado')}
                          className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all uppercase tracking-wider"
                        >
                          Alterar
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="bg-white border-b border-slate-200/60 px-4 py-4 sm:px-6 shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input
              type="text"
              placeholder="Buscar por turma ou professor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-200 transition-all outline-none"
            />
          </div>
          
          <div className="bg-slate-100/80 p-1 rounded-2xl flex items-center gap-1 w-full md:w-auto">
            <button
              onClick={() => setOnlyMine(true)}
              className={cn(
                "flex-1 md:flex-none px-5 py-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 tracking-tight",
                onlyMine 
                  ? "bg-white text-emerald-600 shadow-sm ring-1 ring-black/5" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <UserCheck size={14} className={onlyMine ? "text-emerald-500" : "text-slate-400"} />
              MINHAS TURMAS
            </button>
            <button
              onClick={() => setOnlyMine(false)}
              className={cn(
                "flex-1 md:flex-none px-5 py-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 tracking-tight",
                !onlyMine 
                  ? "bg-white text-emerald-600 shadow-sm ring-1 ring-black/5" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Users size={14} className={!onlyMine ? "text-emerald-500" : "text-slate-400"} />
              TODAS AS TURMAS
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredTurmas.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-slate-400 font-medium">Nenhuma turma encontrada.</p>
            </div>
          ) : (
            filteredTurmas.map(turma => (
              <button
                key={turma.id}
                onClick={() => handleTurmaClick(turma)}
                className="group flex flex-col bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:border-emerald-300 hover:shadow-xl transition-all text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
                
                <div className="flex items-center gap-3 mb-3 relative">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Users size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{turma.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{turma.category || 'Curso'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto relative pt-3 border-t border-slate-50">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar size={12} className="text-emerald-500" />
                      {turma.date ? new Date(turma.date.replace(/-/g, '\/')).toLocaleDateString('pt-BR') : '--'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={12} className="text-emerald-500" />
                      {turma.time || '--:--'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-300 group-hover:text-emerald-500 transition-colors uppercase">
                    Chamada <ChevronRight size={14} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
