import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, LogIn, UserX } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import { TurmaAttendee } from '../../store/useTurmaStore';

interface AttendeeCardProps {
  attendee: TurmaAttendee;
  id: string;
  onViewDetails?: () => void;
  onRemove?: () => void;
  onCheckIn?: () => void;
  onNoShow?: () => void;
}

export function AttendeeCard({ attendee, id, onViewDetails, onRemove, onCheckIn, onNoShow }: AttendeeCardProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({ id });

  const style = { transform: CSS.Transform.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white rounded-xl border border-slate-100 p-3 shadow-sm flex flex-col gap-2 transition-all group/card mb-2',
        isDragging ? 'shadow-xl border-emerald-300 rotate-1 cursor-grabbing scale-[1.02] z-50' : 'hover:border-emerald-200 cursor-grab',
      )}
    >
      <div className="flex items-start gap-3 w-full">
        <img
          src={attendee.photo}
          alt={attendee.name}
          onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}
          className={cn('w-9 h-9 rounded-full object-cover border-2 border-slate-100 shrink-0 mt-0.5', onViewDetails && 'cursor-pointer hover:opacity-80')}
          referrerPolicy="no-referrer"
        />
        <div
          className="flex-1 min-w-0"
          onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}
        >
          {/* Nome do cliente */}
          <p className="text-xs font-bold text-slate-700 truncate leading-tight">{attendee.name}</p>
          {/* Responsável */}
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            {attendee.responsible || 'Sem responsável'}
          </p>
          {/* Infos básicas: venda e recebido */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {attendee.vendas > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                R$ {attendee.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            )}
            {attendee.valor_recebido != null && attendee.valor_recebido > 0 && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                Rec. R$ {attendee.valor_recebido.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            )}
          </div>
        </div>

        {/* Botão remover com confirmação */}
        {onRemove && (
          <div className="shrink-0 flex flex-col items-end gap-1">
            {confirmingRemove ? (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setConfirmingRemove(false); onRemove(); }}
                  className="px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Sim
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setConfirmingRemove(false); }}
                  className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setConfirmingRemove(true); }}
                className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover/card:opacity-100"
                title="Remover da turma"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* CheckIn / NoShow buttons */}
      {(onCheckIn || onNoShow) && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
          {onCheckIn && attendee.status !== 'confirmado' && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <LogIn size={11} /> CheckIn
            </button>
          )}
          {onNoShow && attendee.status !== 'cancelado' && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onNoShow(); }}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <UserX size={11} /> NoShow
            </button>
          )}
        </div>
      )}
    </div>
  );
}
