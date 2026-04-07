import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  Package,
  Users,
  ChevronRight,
  DollarSign,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Trash2,
  Edit2,
  Loader2,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useLeadStore } from '../store/useLeadStore';
import { useTurmaStore, Turma, TurmaAttendee, AttendanceStatus } from '../store/useTurmaStore';
import { UnifiedTurmaProductForm } from '../components/forms/UnifiedTurmaProductForm';
import { cn } from '../lib/utils';
import { useEffect } from 'react';

const STATUS_COLUMNS: { id: AttendanceStatus; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { id: 'confirmado', label: 'Confirmado', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={14} className="text-emerald-600" /> },
  { id: 'indeciso', label: 'Indeciso', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <HelpCircle size={14} className="text-amber-600" /> },
  { id: 'cancelado', label: 'Cancelado', color: 'text-red-500', bg: 'bg-red-50 border-red-200', icon: <XCircle size={14} className="text-red-500" /> },
];

const TURMA_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  em_andamento: { label: 'Em Andamento', color: 'bg-emerald-100 text-emerald-700' },
  concluida: { label: 'Concluída', color: 'bg-slate-100 text-slate-600' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-600' },
};

export function Turmas() {
  const { turmas, fetchTurmas, updateAttendeeStatus, removeTurma, isLoading } = useTurmaStore();
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [isNewTurmaOpen, setIsNewTurmaOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    if (!selectedTurma) return;
    updateAttendeeStatus(selectedTurma.id, draggableId, destination.droppableId as AttendanceStatus);
    // refresh selected turma from store
    setSelectedTurma(prev => {
      if (!prev) return null;
      return {
        ...prev,
        attendees: prev.attendees.map(a =>
          a.id === draggableId ? { ...a, status: destination.droppableId as AttendanceStatus } : a
        ),
      };
    });
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
            onClick={() => {
              setEditingTurma(null);
              setIsNewTurmaOpen(true);
            }}
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
                      {turma.product}
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
            <div className="px-4 sm:px-6 py-3 bg-slate-50/50 border-b border-slate-100 grid grid-cols-3 gap-2 sm:gap-4">
              {STATUS_COLUMNS.map(col => {
                const count = (liveSelectedTurma.attendees || []).filter(a => a.status === col.id).length;
                const total = (liveSelectedTurma.attendees || []).filter(a => a.status === col.id).reduce((s, a) => s + (a.vendas || 0), 0);
                return (
                  <div key={col.id} className={cn('rounded-xl p-3 border transition-colors', col.bg)}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {col.icon}
                      <span className={cn('text-xs font-bold', col.color)}>{col.label}</span>
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
              
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex lg:flex-row flex-col gap-4 h-full min-h-[300px]">
                  {STATUS_COLUMNS.map(col => {
                    const attendeesCount = (liveSelectedTurma.attendees || []).filter(a => a.status === col.id).length;
                    return (
                      <div key={col.id} className="flex flex-col flex-1 min-w-[200px]">
                        <div className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl border mb-3 shadow-sm', col.bg)}>
                          {col.icon}
                          <span className={cn('text-xs font-bold', col.color)}>{col.label}</span>
                          <span className="ml-auto text-xs font-bold text-slate-400">{attendeesCount}</span>
                        </div>
                        
                        <Droppable droppableId={col.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                'flex-1 space-y-2.5 p-2 rounded-xl min-h-[150px] transition-colors',
                                snapshot.isDraggingOver ? 'bg-emerald-50/50 ring-2 ring-emerald-100 ring-inset' : 'bg-slate-50/30'
                              )}
                            >
                              {(liveSelectedTurma.attendees || [])
                                .filter(a => a.status === col.id)
                                .map((att, index) => {
                                  const DraggableAny = Draggable as any;
                                  return (
                                    <DraggableAny key={att.id} draggableId={att.id} index={index}>
                                      {(prov: any, snap: any) => (
                                        <AttendeeCard
                                          attendee={att}
                                          innerRef={prov.innerRef}
                                          draggableProps={prov.draggableProps}
                                          dragHandleProps={prov.dragHandleProps}
                                          isDragging={snap.isDragging}
                                        />
                                      )}
                                    </DraggableAny>
                                  );
                                })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              </DragDropContext>
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
                    <div key={att.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
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
    </div>
  );
}

/* ---- Attendee Card ---- */
interface AttendeeCardProps {
  attendee: TurmaAttendee;
  innerRef: React.Ref<HTMLDivElement>;
  draggableProps: any;
  dragHandleProps: any;
  isDragging: boolean;
}
function AttendeeCard({ attendee, innerRef, draggableProps, dragHandleProps, isDragging }: AttendeeCardProps) {
  return (
    <div
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      className={cn(
        'bg-white rounded-xl border border-slate-100 p-3 shadow-sm flex items-center gap-3 transition-all',
        isDragging ? 'shadow-xl border-emerald-300 rotate-1' : 'hover:border-emerald-200'
      )}
    >
      <img src={attendee.photo} alt={attendee.name} className="w-8 h-8 rounded-full object-cover border-2 border-slate-100 shrink-0" referrerPolicy="no-referrer" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-700 truncate">{attendee.name}</p>
        <p className="text-[10px] text-slate-400 truncate">{attendee.responsible}</p>
      </div>
      {attendee.vendas > 0 && (
        <span className="text-[10px] font-bold text-emerald-700 shrink-0">
          R$ {attendee.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}

