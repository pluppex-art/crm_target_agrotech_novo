import React, { useState } from 'react';
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
  CheckCircle2,
  HelpCircle,
  XCircle,
  Trash2,
  Edit2,
  BookOpen,
} from 'lucide-react';
import { DndContext, useSensors, useSensor, PointerSensor, closestCenter, Active, Over } from '@dnd-kit/core';
import {
  useDroppable,
  useDraggable,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  CSS,
  Transform
} from '@dnd-kit/utilities';
import { useTurmaStore, Turma, TurmaAttendee, AttendanceStatus } from '../store/useTurmaStore';
import { Loader2 } from 'lucide-react';
import { UnifiedTurmaProductForm } from '../components/forms/UnifiedTurmaProductForm';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { Lead } from '../types/leads';
import { getSupabaseClient } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

// ── Column definitions — order: matriculado → cancelado → indeciso → confirmado ──
const STATUS_COLUMNS: { id: AttendanceStatus; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { id: 'matriculado', label: 'Matriculado', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <BookOpen size={14} className="text-blue-600" /> },
  { id: 'cancelado', label: 'Cancelado', color: 'text-red-500', bg: 'bg-red-50 border-red-200', icon: <XCircle size={14} className="text-red-500" /> },
  { id: 'indeciso', label: 'Indeciso', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <HelpCircle size={14} className="text-amber-600" /> },
  { id: 'confirmado', label: 'Confirmado', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={14} className="text-emerald-600" /> },
];

const TURMA_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  em_andamento: { label: 'Em Andamento', color: 'bg-emerald-100 text-emerald-700' },
  concluida: { label: 'Concluída', color: 'bg-slate-100 text-slate-600' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-600' },
};

// ── Fetch a full Lead from Supabase by id ────────────────────────────────────
async function fetchLeadById(leadId: string): Promise<Lead | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (error) { console.error('Error fetching lead:', error); return null; }
  return data as Lead;
}

export function Turmas() {
  const { hasPermission } = usePermissions();
  const { turmas, fetchTurmas, updateAttendeeStatus, removeTurma, removeAttendee, isLoading, subscribe } = useTurmaStore();
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [isNewTurmaOpen, setIsNewTurmaOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [setupRequired] = useState(false);
  const [responsibles, setResponsibles] = useState<string[]>([]);

  // Attendee detail modal
  const [selectedAttendeeLead, setSelectedAttendeeLead] = useState<Lead | null>(null);
  const [selectedAttendeeInfo, setSelectedAttendeeInfo] = useState<{ turmaId: string; attendeeId: string; currentStatus: AttendanceStatus } | null>(null);
  const [loadingAttendeeDetail, setLoadingAttendeeDetail] = useState(false);

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

  const onDragEnd = (event: DragEndEvent) => {
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

  const handleAttendeeClick = async (attendee: TurmaAttendee, turmaId: string) => {
    if (!attendee.lead_id) return;
    setLoadingAttendeeDetail(true);
    const lead = await fetchLeadById(attendee.lead_id);
    setLoadingAttendeeDetail(false);
    if (lead) {
      setSelectedAttendeeLead(lead);
      setSelectedAttendeeInfo({ turmaId, attendeeId: attendee.id, currentStatus: attendee.status });
    }
  };

  const liveSelectedTurma = selectedTurma
    ? turmas.find(t => t.id === selectedTurma.id) ?? selectedTurma
    : null;

  const totalVendasTurma = (t: Turma) =>
    t.attendees.reduce((acc, a) => acc + a.vendas, 0);



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

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 gap-4 content-start">
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
            turmas.map(turma => {
              const confirmados = (turma.attendees || []).filter(a => a.status === 'confirmado').length;
              const st = TURMA_STATUS_LABELS[turma.status] || TURMA_STATUS_LABELS.agendada;
              const isSelected = liveSelectedTurma?.id === turma.id;

              return (
                <div
                  key={turma.id}
                  onClick={() => setSelectedTurma(isSelected ? null : turma)}
                  className={cn(
                    'bg-white rounded-2xl p-5 border cursor-pointer transition-all shadow-sm hover:shadow-md group',
                    isSelected ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-100 hover:border-emerald-200'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', st.color)}>{st.label}</span>
                      <h3 className="font-bold text-slate-800 mt-2 leading-tight">{turma.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{turma.professor_name || 'Sem professor'}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingTurma(turma); setIsNewTurmaOpen(true); }}
                        className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-300 hover:text-emerald-500 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); removeTurma(turma.id); if (isSelected) setSelectedTurma(null); }}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-emerald-500 shrink-0" />
                      {turma.date ? new Date(turma.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Data não definida'}
                      <Clock size={12} className="text-emerald-500 ml-1 shrink-0" />
                      {turma.time || '--:--'}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{turma.location || 'Sem localização'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package size={12} className="text-emerald-500 shrink-0" />
                      {turma.product_name}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Users size={12} className="text-slate-400" />
                      <span className="font-semibold text-slate-700">{confirmados}</span>
                      <span className="text-slate-400">/ {(turma.attendees || []).length} confirmados</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">
                      R$ {totalVendasTurma(turma).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: (turma.attendees || []).length ? `${(confirmados / turma.attendees.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })
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
              <button
                onClick={() => setSelectedTurma(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors shadow-sm bg-white shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats Row */}
            <div className="px-4 sm:px-6 py-3 bg-slate-50/50 border-b border-slate-100 grid grid-cols-4 gap-2 sm:gap-3">
              {STATUS_COLUMNS.map(col => {
                const count = (liveSelectedTurma.attendees || []).filter(a => a.status === col.id).length;
                const total = (liveSelectedTurma.attendees || []).filter(a => a.status === col.id).reduce((s, a) => s + (a.vendas || 0), 0);
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

            {/* Kanban Attendance */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
                Lista de Presença
              </p>

              <DndContext 
                key={`dnd-${liveSelectedTurma.id}`} 
                sensors={sensors} 
                collisionDetection={closestCenter} 
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
                    />
                  ))}
                </div>
              </DndContext>
            </div>

            {/* Vendor Sales Table */}
            <div className="border-t border-slate-100 p-4 bg-white shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance de Vendas</p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <DollarSign size={10} />
                  Total R$ {totalVendasTurma(liveSelectedTurma).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </div>
              </div>

              <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                {(liveSelectedTurma.attendees || [])
                  .slice()
                  .sort((a, b) => (b.vendas || 0) - (a.vendas || 0))
                  .map(att => (
                    <div
                      key={att.id}
                      onClick={() => att.lead_id && handleAttendeeClick(att, liveSelectedTurma.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors",
                        att.lead_id ? "cursor-pointer hover:bg-emerald-50 hover:border-emerald-200" : ""
                      )}
                    >
                      <img src={att.photo} alt={att.name} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{att.responsible || 'Sem responsável'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-700">R$ {(att.vendas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                        <div className="w-20 h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: totalVendasTurma(liveSelectedTurma) > 0
                                ? `${((att.vendas || 0) / totalVendasTurma(liveSelectedTurma)) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
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
          onTurmaStatusChange={(turmaId: string, attendeeId: string, status: AttendanceStatus) => {
            updateAttendeeStatus(turmaId, attendeeId, status);
            setSelectedAttendeeInfo(prev => prev ? { ...prev, currentStatus: status } : null);
          }}
        />
      )}
    </div>
  );
}

/* ── Turma Column Component ────────────────────────────────────────────────── */
interface TurmaColumnProps {
  column: typeof STATUS_COLUMNS[number];
  attendees: TurmaAttendee[];
  onAttendeeClick: (att: TurmaAttendee) => void;
  onRemoveAttendee: (attId: string) => void;
}

function TurmaColumn({ column, attendees, onAttendeeClick, onRemoveAttendee }: TurmaColumnProps) {
  const attendeesInCol = attendees.filter(a => a.status === column.id);
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col flex-1 min-w-[180px]">
      <div className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl border mb-3 shadow-sm', column.bg)}>
        {column.icon}
        <span className={cn('text-xs font-bold', column.color)}>{column.label}</span>
        <span className="ml-auto text-xs font-bold text-slate-400">{attendeesInCol.length}</span>
      </div>

      <div className="flex-1 space-y-2.5 p-2 rounded-xl min-h-[150px]">
        <div ref={setNodeRef} className={cn(
          'min-h-[150px]',
          isOver ? 'bg-emerald-50/50 ring-2 ring-emerald-100 ring-inset' : 'bg-slate-50/30'
        )}>
          {attendeesInCol.map((att) => (
            <AttendeeCard
              key={att.id}
              attendee={att}
              id={att.id}
              onViewDetails={att.lead_id ? () => onAttendeeClick(att) : undefined}
              onRemove={() => onRemoveAttendee(att.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Attendee Card ─────────────────────────────────────────────────────────── */
interface AttendeeCardProps {
  attendee: TurmaAttendee;
  id: string;
  onViewDetails?: () => void;
  onRemove?: () => void;
}

function AttendeeCard({ attendee, id, onViewDetails, onRemove }: AttendeeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white rounded-xl border border-slate-100 p-3 shadow-sm flex items-center gap-3 transition-all group/card',
        isDragging ? 'shadow-xl border-emerald-300 rotate-1 cursor-grabbing scale-[1.02]' : 'hover:border-emerald-200 cursor-grab',
      )}
    >
      <img
        src={attendee.photo}
        alt={attendee.name}
        onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}
        className={cn('w-8 h-8 rounded-full object-cover border-2 border-slate-100 shrink-0', onViewDetails && 'cursor-pointer hover:opacity-80')}
        referrerPolicy="no-referrer"
      />
      <div className="flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}>
        <p className="text-xs font-bold text-slate-700 truncate">{attendee.name}</p>
        <p className="text-[10px] text-slate-400 truncate">{attendee.responsible}</p>
      </div>
      {attendee.vendas > 0 && (
        <span className="text-[10px] font-bold text-emerald-700 shrink-0">
          R$ {attendee.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
        </span>
      )}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover/card:opacity-100 shrink-0"
          title="Remover da turma"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
