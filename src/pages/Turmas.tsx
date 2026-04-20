import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Calendar,
  Users,
  MapPin,
  Clock,
  X,
  XCircle,
  Loader2,
  DollarSign,
  Edit2,
  BookOpen,
  Search,
  LayoutGrid,
  LayoutList,
  CheckCheck,
  LogIn,
  UserX,
  BadgeCheck,
} from 'lucide-react';
import { DndContext, useSensors, useSensor, PointerSensor, closestCenter, DragOverlay } from '@dnd-kit/core';
import { useTurmaStore, Turma, TurmaAttendee, AttendanceStatus } from '../store/useTurmaStore';
import { usePermissions } from '../hooks/usePermissions';
import { NewTurmaModal } from '../components/marketing/NewTurmaModal';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { getSupabaseClient } from '../lib/supabase';
import { Lead } from '../types/leads';
import { cn } from '../lib/utils';

// Extraídos para componentes separados
import { TurmaColumn } from '../components/turmas/TurmaColumn';
import { AttendeeCard } from '../components/turmas/AttendeeCard';

// ── Constants ─────────────────────────────────────────────────────────────
const STATUS_COLUMNS = [
  { id: 'matriculado', label: 'Matriculado', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <Users size={14} className="text-blue-600" /> },
  { id: 'indeciso', label: 'Indeciso', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <Clock size={14} className="text-amber-600" /> },
  { id: 'cancelado', label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: <XCircle size={14} className="text-red-600" /> },
  { id: 'confirmado', label: 'Confirmado', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCheck size={14} className="text-emerald-600" /> },
];

const TURMA_STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <Calendar size={12} /> },
  em_andamento: { label: 'Em Andamento', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <Clock size={12} /> },
  concluida: { label: 'Concluída', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <CheckCheck size={12} /> },
  cancelada: { label: 'Cancelada', color: 'bg-red-50 text-red-600 border-red-100', icon: <XCircle size={12} /> },
};

// ── Helpers ───────────────────────────────────────────────────────────────
async function fetchLeadById(leadId: string): Promise<Lead | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (error || !data) return null;
  return data as Lead;
}

const totalVendasTurma = (turma: Turma) => 
  (turma.attendees || []).reduce((acc, att) => acc + (att.vendas || 0), 0);
const totalRecebidoTurma = (turma: Turma) => 
  (turma.attendees || []).reduce((acc, att) => acc + (att.valor_recebido || 0), 0);

// ── Componente Principal ──────────────────────────────────────────────────
export function Turmas() {
  const { hasPermission } = usePermissions();
  const { turmas, fetchTurmas, updateAttendeeStatus, updateTurma, removeTurma, removeAttendee, isLoading, subscribe } = useTurmaStore();
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [isNewTurmaOpen, setIsNewTurmaOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

  // Attendee detail modal
  const [selectedAttendeeLead, setSelectedAttendeeLead] = useState<Lead | null>(null);
  const [selectedAttendeeInfo, setSelectedAttendeeInfo] = useState<{ turmaId: string; attendeeId: string; currentStatus: AttendanceStatus } | null>(null);
  const [loadingAttendeeDetail, setLoadingAttendeeDetail] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'info' | 'turma'>('info');

  useEffect(() => {
    fetchTurmas();
    const unsubscribe = subscribe();
    return () => unsubscribe();
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filteredTurmas = useMemo(() => {
    return turmas.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.professor_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  }, [turmas, searchTerm]);

  const onDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || !selectedTurma) return;
    const attendeeId: string = active.id as string;
    const newStatus: AttendanceStatus = over.id as AttendanceStatus;
    updateAttendeeStatus(selectedTurma.id as string, attendeeId, newStatus);
  };

  const handleAttendeeClick = async (attendee: TurmaAttendee, turmaId: string, tab: 'info' | 'turma' = 'info') => {
    if (!attendee.lead_id) return;
    setLoadingAttendeeDetail(true);
    const lead = await fetchLeadById(attendee.lead_id);
    setLoadingAttendeeDetail(false);
    if (lead) {
      setModalInitialTab(tab);
      setSelectedAttendeeLead(lead);
      setSelectedAttendeeInfo({ turmaId, attendeeId: attendee.id, currentStatus: attendee.status });
    }
  };

  const handleCheckIn = (attendee: TurmaAttendee, turmaId: string) => {
    updateAttendeeStatus(turmaId, attendee.id, 'confirmado');
    handleAttendeeClick({ ...attendee, status: 'confirmado' }, turmaId, 'turma');
  };

  const handleMarkConcluida = () => {
    if (!liveSelectedTurma) return;
    updateTurma(liveSelectedTurma.id, { status: 'concluida' });
  };

  const liveSelectedTurma = selectedTurma
    ? turmas.find(t => t.id === selectedTurma.id) ?? selectedTurma
    : null;

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Turmas</h1>
            <p className="text-sm text-slate-500 font-medium">Controle de presença, matrículas e performance financeira</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar turma ou professor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl w-full md:w-64 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm transition-all shadow-sm"
              />
            </div>
            {hasPermission('marketing', 'create') && (
              <button
                onClick={() => setIsNewTurmaOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50 text-sm font-bold"
              >
                <Plus size={20} />
                Nova Turma
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Side: Turmas List */}
        <div className={cn(
          "flex-1 overflow-y-auto p-6 pt-2 grid gap-6 content-start transition-all duration-300",
          liveSelectedTurma ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
        )}>
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="font-bold text-sm">Carregando turmas...</p>
            </div>
          ) : filteredTurmas.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <BookOpen className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold">Nenhuma turma encontrada</p>
              <p className="text-sm">Tente ajustar sua busca ou criar uma nova turma.</p>
            </div>
          ) : (
            filteredTurmas.map(turma => {
              const isSelected = selectedTurma?.id === turma.id;
              const status = TURMA_STATUS_LABELS[turma.status] || TURMA_STATUS_LABELS.agendada;
              const totalVendas = totalVendasTurma(turma);
              const totalVagas = turma.capacity || 20;
              const ocupadas = (turma.attendees || []).length;
              
              return (
                <div
                  key={turma.id}
                  onClick={() => setSelectedTurma(isSelected ? null : turma)}
                  className={cn(
                    'bg-white rounded-2xl p-5 border cursor-pointer transition-all shadow-sm hover:shadow-md group relative overflow-hidden',
                    isSelected ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-100 hover:border-emerald-200'
                  )}
                >
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 text-lg leading-tight truncate group-hover:text-emerald-700 transition-colors">{turma.name}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-1.5 uppercase tracking-wider">
                        PROF. {turma.professor_name || 'NÃO DEFINIDO'}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border flex items-center gap-1.5', status.color)}>
                      {status.icon} {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5 relative z-10">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacidade</p>
                      <div className="flex items-end gap-2">
                        <span className="text-lg font-black text-slate-700 leading-none">{ocupadas}</span>
                        <span className="text-xs font-bold text-slate-400">/ {totalVagas} alunos</span>
                      </div>
                      <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(ocupadas/totalVagas)*100}%` }} />
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento Potencial</p>
                      <p className="text-lg font-black text-emerald-600 leading-none">R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                      <p className="text-[10px] font-bold text-emerald-500 mt-1 opacity-80 uppercase tracking-wider">Total em vendas</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500 pt-4 border-t border-slate-100 relative z-10">
                    <span className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded-lg">
                      <Calendar size={13} className="text-emerald-500" />
                      {turma.date ? new Date(turma.date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded-lg">
                      <Clock size={13} className="text-emerald-500" />
                      {turma.time?.substring(0, 5) || '--:--'}
                    </span>
                    {hasPermission('marketing', 'edit') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingTurma(turma); }}
                        className="ml-auto p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Detail Panel */}
        <AnimatePresence>
          {liveSelectedTurma && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-[600px] bg-white border-l border-slate-200 shadow-2xl flex flex-col z-20"
            >
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/30">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-black text-slate-800 truncate">{liveSelectedTurma.name}</h2>
                    <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border', TURMA_STATUS_LABELS[liveSelectedTurma.status]?.color || 'bg-slate-50')}>
                      {liveSelectedTurma.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Users size={11} className="text-emerald-500" />{liveSelectedTurma.professor_name || 'Sem professor'}</div>
                    <div className="hidden sm:flex items-center gap-1"><MapPin size={11} className="text-emerald-500" />{liveSelectedTurma.location || '--'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {liveSelectedTurma.status !== 'concluida' && (
                    <button
                      onClick={handleMarkConcluida}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all"
                    >
                      <CheckCheck size={14} />
                      <span className="hidden sm:inline">Concluída</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button onClick={() => setViewMode('kanban')} className={cn('p-1.5 rounded-md transition-all', viewMode === 'kanban' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400')}><LayoutGrid size={15} /></button>
                    <button onClick={() => setViewMode('lista')} className={cn('p-1.5 rounded-md transition-all', viewMode === 'lista' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400')}><LayoutList size={15} /></button>
                  </div>
                  <button onClick={() => setSelectedTurma(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors shadow-sm bg-white"><X size={20} /></button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="px-6 py-4 bg-white border-b border-slate-50 flex items-center justify-around gap-2">
                {[
                  { label: 'Matriculados', val: (liveSelectedTurma.attendees || []).length, color: 'text-slate-700' },
                  { label: 'Confirmados', val: (liveSelectedTurma.attendees || []).filter(a => a.status === 'confirmado').length, color: 'text-emerald-600' },
                  { label: 'Faturamento', val: `R$ ${totalRecebidoTurma(liveSelectedTurma).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, color: 'text-blue-600' },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                    <p className={cn("text-sm font-black", stat.color)}>{stat.val}</p>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                {viewMode === 'kanban' ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <div className="flex lg:flex-row flex-col gap-4 h-full min-h-[300px]">
                      {STATUS_COLUMNS.map(col => (
                        <TurmaColumn
                          key={col.id}
                          column={col}
                          attendees={liveSelectedTurma.attendees || []}
                          onAttendeeClick={(att) => handleAttendeeClick(att, liveSelectedTurma.id)}
                          onRemoveAttendee={(attId) => removeAttendee(liveSelectedTurma.id, attId)}
                          onCheckIn={(att) => handleCheckIn(att, liveSelectedTurma.id)}
                          onNoShow={(att) => updateAttendeeStatus(liveSelectedTurma.id as string, att.id as string, 'cancelado' as AttendanceStatus)}
                        />
                      ))}
                    </div>
                  </DndContext>
                ) : (
                  <div className="space-y-2">
                    {(liveSelectedTurma.attendees || []).map(att => {
                      const isPago = (att.valor_recebido ?? 0) > 0;
                      const colDef = STATUS_COLUMNS.find(c => c.id === att.status);
                      return (
                        <div key={att.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-sm hover:border-emerald-200 transition-colors">
                          <div className="relative shrink-0">
                            <img src={att.photo} alt={att.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-100" referrerPolicy="no-referrer" />
                            {isPago && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"><BadgeCheck size={10} className="text-white" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{att.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{att.responsible || 'Sem responsável'}</p>
                          </div>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', colDef?.bg, colDef?.color)}>{colDef?.label}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {att.lead_id && att.status !== 'confirmado' && (
                              <button onClick={() => handleCheckIn(att, liveSelectedTurma.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                                <LogIn size={11} /> CheckIn
                              </button>
                            )}
                            {att.lead_id && att.status !== 'cancelado' && (
                              <button onClick={() => updateAttendeeStatus(liveSelectedTurma.id as string, att.id as string, 'cancelado' as AttendanceStatus)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                                <UserX size={11} /> NoShow
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <NewTurmaModal isOpen={isNewTurmaOpen} onClose={() => setIsNewTurmaOpen(false)} />
      {editingTurma && (
        <NewTurmaModal
          isOpen={true}
          onClose={() => setEditingTurma(null)}
          turma={editingTurma}
        />
      )}

      {selectedAttendeeLead && (
        <LeadDetailsModal
          isOpen={true}
          onClose={() => {
            setSelectedAttendeeLead(null);
            setSelectedAttendeeInfo(null);
            fetchTurmas();
          }}
          lead={selectedAttendeeLead}
          turmaAttendee={selectedAttendeeInfo ?? undefined}
          currentStageId={selectedAttendeeInfo?.currentStatus}
          initialTab={modalInitialTab}
          onTurmaStatusChange={(turmaId: string, attendeeId: string, status: AttendanceStatus) => {
            updateAttendeeStatus(turmaId as string, attendeeId as string, status);
            setSelectedAttendeeInfo(prev => prev ? { ...prev, currentStatus: status } : null);
          }}
        />
      )}
    </div>
  );
}
