import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCheck,
  LayoutGrid,
  LayoutList,
  X,
  LogIn,
  UserX,
  BadgeCheck,
  Users,
} from 'lucide-react';
import { DndContext, useSensors, useSensor, PointerSensor, closestCenter, DragOverlay, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { TurmaColumn } from './TurmaColumn';
import { AttendeeCard } from './AttendeeCard';
import { Turma, TurmaAttendee, AttendanceStatus } from '../../store/useTurmaStore';
import { STATUS_COLUMNS } from '../../lib/turmas';
import { cn } from '../../lib/utils';

interface TurmasRightPanelProps {
  liveSelectedTurma: Turma;
  viewMode: 'kanban' | 'lista';
  setViewMode: (mode: 'kanban' | 'lista') => void;
  setSelectedTurma: (turma: Turma | null) => void;
  handleToggleConcluida: () => void;
  activeId: string | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  handleAttendeeClick: (att: TurmaAttendee, turmaId: string) => void;
  removeAttendee: (turmaId: string, attId: string) => void;
  handleCheckIn: (att: TurmaAttendee, turmaId: string) => void;
  handleNoShow: (att: TurmaAttendee, turmaId: string) => void;
}

export function TurmasRightPanel({
  liveSelectedTurma,
  viewMode,
  setViewMode,
  setSelectedTurma,
  handleToggleConcluida,
  activeId,
  onDragStart,
  onDragEnd,
  handleAttendeeClick,
  removeAttendee,
  handleCheckIn,
  handleNoShow,
}: TurmasRightPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  return (
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
            <span className="flex items-center gap-1"><Users size={11} className="text-emerald-500" />Meta: {liveSelectedTurma.meta ?? '--'} alunos</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleConcluida}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              liveSelectedTurma.status === 'concluida'
                ? "bg-emerald-600 border border-emerald-700 text-white hover:bg-emerald-700 shadow-sm"
                : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            )}
            title={liveSelectedTurma.status === 'concluida' ? "Reabrir turma" : "Marcar turma como concluída"}
          >
            {liveSelectedTurma.status === 'concluida' ? (
              <>
                <CheckCheck size={14} />
                <span className="hidden sm:inline">Turma Concluída</span>
              </>
            ) : (
              <>
                <CheckCheck size={14} />
                <span className="hidden sm:inline">Concluir Turma</span>
              </>
            )}
          </button>
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
  );
}
