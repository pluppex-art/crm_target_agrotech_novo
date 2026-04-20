import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  Package,
  Users,
  DollarSign,
  LayoutGrid,
  LayoutList,
  CheckCheck,
  LogIn,
  UserX,
  BadgeCheck,
} from 'lucide-react';
import { DndContext, useSensors, useSensor, PointerSensor, closestCenter } from '@dnd-kit/core';
import {
  useDroppable,
  useDraggable,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTurmaStore, Turma, TurmaAttendee, AttendanceStatus } from '../store/useTurmaStore';
import { Loader2, Search } from 'lucide-react';

import { UnifiedTurmaProductForm } from '../components/forms/UnifiedTurmaProductForm';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { getSupabaseClient } from '../lib/supabase';
import { Lead } from '../types/leads';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { 
  totalVendasTurma, 
  TURMA_STATUS_LABELS, 
  STATUS_COLUMNS, 
  fetchLeadById 
} from '../lib/turmas';
import { TurmaCard } from '../components/turmas/TurmaCard';
import { TurmaColumn } from '../components/turmas/TurmaColumn';
import { AttendeeCard } from '../components/turmas/AttendeeCard';



export function Turmas() {
  const { hasPermission } = usePermissions();
  const { turmas, fetchTurmas, updateAttendeeStatus, removeTurma, removeAttendee, isLoading, subscribe } = useTurmaStore();
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [isNewTurmaOpen, setIsNewTurmaOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [setupRequired] = useState(false);
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

  // Attendee detail modal
  const [selectedAttendeeLead, setSelectedAttendeeLead] = useState<Lead | null>(null);
  const [selectedAttendeeInfo, setSelectedAttendeeInfo] = useState<{ turmaId: string; attendeeId: string; currentStatus: AttendanceStatus } | null>(null);
  const [loadingAttendeeDetail, setLoadingAttendeeDetail] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'info' | 'turma'>('info');

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  // Fetch distinct responsibles directly from the database
  useEffect(() => {
    const fetchResponsibles = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('leads')
        .select('responsible')
        .not('responsible', 'is', null)
        .neq('responsible', '');
      if (data) {
        const unique = Array.from(new Set(data.map((r: any) => r.responsible).filter(Boolean))) as string[];
        setResponsibles(unique);
      }
    };
    fetchResponsibles();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, []); // Subscribe once

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  if (!hasPermission('turmas.view')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[600px] text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <GraduationCap className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Acesso Bloqueado</h2>
        <p className="text-slate-500 max-w-md mb-4 leading-relaxed">
          Você precisa da permissão <code className="bg-slate-100 px-2 py-1 rounded-lg text-sm font-mono text-slate-700">turmas.view</code> para acessar as turmas.
        </p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Contate o administrador</p>
      </div>
    );
  }

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !selectedTurma) return;
    const newStatus = over.id as AttendanceStatus;
    const attendeeId = active.id as string;
    updateAttendeeStatus(selectedTurma.id, attendeeId, newStatus);
    setSelectedTurma(prev => {
      if (!prev) return null;
      return {
        ...prev,
        attendees: prev.attendees.map(a =>
          a.id === attendeeId ? { ...a, status: newStatus } : a
        ),
      };
    });
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

  const handleNoShow = (attendee: TurmaAttendee, turmaId: string) => {
    updateAttendeeStatus(turmaId, attendee.id, 'cancelado');
  };

  const liveSelectedTurma = selectedTurma
    ? turmas.find(t => t.id === selectedTurma.id) ?? selectedTurma
    : null;

  const handleMarkConcluida = () => {
    if (!liveSelectedTurma) return;
    // TODO: Call store updateTurma when implemented
    console.log('Marking turma as concluida:', liveSelectedTurma.id);
  };



  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#f3f6f9] overflow-hidden relative">
      {/* Left Panel — Turmas Cards */}
      <div
        key="left-panel"
        className={cn(
          'flex flex-col transition-all duration-300 h-full overflow-hidden',
          liveSelectedTurma ? 'lg:w-[420px] lg:min-w-[420px] hidden lg:flex' : 'flex-1'
        )}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 pb-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="text-emerald-600 shrink-0" size={26} />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">Turmas</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Gerencie turmas e presenças.</p>
            </div>
          </div>
          <button
            onClick={() => { setEditingTurma(null); setIsNewTurmaOpen(true); }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold text-sm"
          >
            <Plus size={18} />
            <span className="whitespace-nowrap">Nova Turma</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 pb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, professor ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 shadow-sm"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 grid grid-cols-1 gap-4 content-start">
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p>Carregando turmas...</p>
            </div>
          ) : setupRequired ? (
            <div className="col-span-full">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="text-amber-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-amber-900 mb-2">Configuração Necessária</h3>
                <p className="text-sm text-amber-700 max-w-md mb-6">
                  A tabela de turmas ainda não foi criada no seu banco de dados Supabase.
                  Para corrigir isso e ativar este módulo, siga as instruções abaixo:
                </p>
                <div className="bg-white border border-amber-100 rounded-xl p-4 text-left w-full max-w-lg mb-6 shadow-sm">
                  <ol className="list-decimal list-inside space-y-3 text-xs text-slate-600">
                    <li>Abra o arquivo <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">turmas_schema.sql</code> e copie o conteúdo.</li>
                    <li>Vá ao seu <strong>Dashboard do Supabase</strong>.</li>
                    <li>Acesse o <strong>SQL Editor</strong> e crie uma <strong>New Query</strong>.</li>
                    <li>Cole o código e clique em <strong>Run</strong>.</li>
                  </ol>
                </div>
                <button
                  onClick={() => fetchTurmas()}
                  className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-md"
                >
                  Já executei o SQL, verificar agora
                </button>
              </div>
            </div>
          ) : turmas.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <GraduationCap size={48} className="mb-3 opacity-30" />
              <p className="font-medium">Nenhuma turma cadastrada</p>
            </div>
          ) : (
            turmas.filter(t => {
              if (!searchTerm.trim()) return true;
              const q = searchTerm.toLowerCase();
              return (
                t.name.toLowerCase().includes(q) ||
                (t.professor_name || '').toLowerCase().includes(q) ||
                t.product_name.toLowerCase().includes(q)
              );
            }).map(turma => (
<TurmaCard
                key={turma.id}
                turma={turma}
                isSelected={liveSelectedTurma?.id === turma.id}
                onSelect={(turma: Turma) => setSelectedTurma(selectedTurma?.id === turma.id ? null : turma)}
                onEdit={(turma: Turma) => {
                  setEditingTurma(turma);
                  setIsNewTurmaOpen(true);
                }}
                onDelete={removeTurma}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Panel — Attendance Detail & Kanban */}
      <AnimatePresence mode="wait">
        {liveSelectedTurma && (
          <motion.div
            key={`detail-panel-${liveSelectedTurma.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed inset-0 lg:relative z-50 lg:z-0 lg:flex-1 flex flex-col border-l border-slate-200 bg-white overflow-hidden"
          >
            {/* Panel Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white relative z-10">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-lg font-bold text-slate-800 leading-tight truncate">{liveSelectedTurma.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{liveSelectedTurma.professor_name || 'Sem professor'}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] sm:text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar size={11} className="text-emerald-500" />{liveSelectedTurma.date ? new Date(liveSelectedTurma.date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</span>
                  <span className="flex items-center gap-1"><Clock size={11} className="text-emerald-500" />{liveSelectedTurma.time || '--:--'}</span>
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
                    <span className="hidden sm:inline">Turma Concluída</span>
                  </button>
                )}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={cn('p-1.5 rounded-md transition-all', viewMode === 'kanban' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600')}
                    title="Visualização Kanban"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode('lista')}
                    className={cn('p-1.5 rounded-md transition-all', viewMode === 'lista' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600')}
                    title="Visualização Lista"
                  >
                    <LayoutList size={15} />
                  </button>
                </div>
                <button
                  onClick={() => setSelectedTurma(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors shadow-sm bg-white shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="px-4 sm:px-6 py-3 bg-slate-50/50 border-b border-slate-100 grid grid-cols-4 gap-2 sm:gap-3">
              {STATUS_COLUMNS.map(col => {
                const count = (liveSelectedTurma.attendees || []).filter(a => a.status === col.id).length;
                const total = (liveSelectedTurma.attendees || []).filter(a => a.status === col.id).reduce((s: number, a) => s + (a.vendas || 0), 0 as number);
                return (
                  <div key={col.id} className={cn('rounded-xl p-2.5 border transition-colors', col.bg)}>
                    <div className="flex items-center gap-1 mb-1">
                      {col.icon}
                      <span className={cn('text-[10px] font-bold hidden sm:block', col.color)}>{col.label}</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{count}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                  </div>
                );
              })}
            </div>

            {/* Attendance content — Kanban or Lista */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {viewMode === 'kanban' ? (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
                    Lista de Presença
                  </p>
                  <DndContext
                    key={`dnd-${liveSelectedTurma.id}`}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  >
                    <div className="flex lg:flex-row flex-col gap-4 h-full min-h-[300px]">
                      {STATUS_COLUMNS.map(col => (
                        <TurmaColumn
                          key={`col-${col.id}-${liveSelectedTurma.id}`}
                          column={col}
                          attendees={liveSelectedTurma.attendees || []}
                          onAttendeeClick={(att) => handleAttendeeClick(att, liveSelectedTurma.id)}
                          onRemoveAttendee={(attId) => removeAttendee(liveSelectedTurma.id, attId)}
                          onCheckIn={(att) => handleCheckIn(att, liveSelectedTurma.id)}
                          onNoShow={(att) => handleNoShow(att, liveSelectedTurma.id)}
                        />
                      ))}
                    </div>
                    <DragOverlay>
                      {activeId ? (
                        <AttendeeCard
                          id={activeId}
                          attendee={liveSelectedTurma.attendees?.find(a => a.id === activeId)!}
                          isOverlay
                        />
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
                    Lista de Presença
                  </p>
                  <div className="space-y-2">
                    {(liveSelectedTurma.attendees || []).map(att => {
                      const isPago = (att.valor_recebido ?? 0) > 0;
                      const colDef = STATUS_COLUMNS.find(c => c.id === att.status);
                      return (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-sm hover:border-emerald-200 transition-colors"
                        >
                          <div className="relative shrink-0">
                            <img src={att.photo} alt={att.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-100" referrerPolicy="no-referrer" />
                            {isPago && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                <BadgeCheck size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{att.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{att.responsible || 'Sem responsável'}</p>
                          </div>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline', colDef?.bg, colDef?.color)}>
                            {colDef?.label}
                          </span>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold text-emerald-700">R$ {(att.vendas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                            {isPago && <p className="text-[10px] text-emerald-500">Rec. R$ {att.valor_recebido!.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {att.lead_id && att.status !== 'confirmado' && (
                              <button
                                onClick={() => handleCheckIn(att, liveSelectedTurma.id)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Check-in"
                              >
                                <LogIn size={11} /> CheckIn
                              </button>
                            )}
                            {att.lead_id && att.status !== 'cancelado' && (
                              <button
                                onClick={() => handleNoShow(att, liveSelectedTurma.id)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title="No-show"
                              >
                                <UserX size={11} /> NoShow
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>


          </motion.div>
        )}
      </AnimatePresence>

      {/* Forms & Modals */}
      <UnifiedTurmaProductForm
        isOpen={isNewTurmaOpen}
        onClose={() => { setIsNewTurmaOpen(false); setEditingTurma(null); }}
        mode="turma"
        initialData={editingTurma ?? undefined}
      />

      {/* Loading overlay for attendee detail */}
      {loadingAttendeeDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={20} />
            <span className="text-sm font-medium text-slate-700">Carregando dados do cliente...</span>
          </div>
        </div>
      )}

      {/* Attendee Lead Detail Modal */}
      {selectedAttendeeLead && (
        <LeadDetailsModal
          isOpen={!!selectedAttendeeLead}
          onClose={() => { setSelectedAttendeeLead(null); setSelectedAttendeeInfo(null); }}
          lead={selectedAttendeeLead}
          turmaAttendee={selectedAttendeeInfo ?? undefined}
          currentStageId={selectedAttendeeInfo?.currentStatus}
          responsibles={responsibles}
          initialTab={modalInitialTab}
          onTurmaStatusChange={(turmaId: string, attendeeId: string, status: AttendanceStatus) => {
            updateAttendeeStatus(turmaId, attendeeId, status);
            setSelectedAttendeeInfo(prev => prev ? { ...prev, currentStatus: status } : null);
          }}
        />
      )}
    </div>
  );
}




