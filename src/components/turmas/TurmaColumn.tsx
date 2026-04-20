import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '../../lib/utils';
import { TurmaAttendee } from '../../store/useTurmaStore';
import { AttendeeCard } from './AttendeeCard';

interface TurmaColumnProps {
  column: {
    id: string;
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
  };
  attendees: TurmaAttendee[];
  onAttendeeClick: (att: TurmaAttendee) => void;
  onRemoveAttendee: (attId: string) => void;
  onCheckIn: (att: TurmaAttendee) => void;
  onNoShow: (att: TurmaAttendee) => void;
}

export function TurmaColumn({ column, attendees, onAttendeeClick, onRemoveAttendee, onCheckIn, onNoShow }: TurmaColumnProps) {
  const attendeesInCol = attendees.filter(a => a.status === column.id);
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[240px] flex flex-col bg-slate-50/50 rounded-2xl p-3 border-2 border-transparent transition-all h-fit max-h-full',
        isOver && 'border-emerald-200 bg-emerald-50/50 shadow-inner'
      )}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('p-1.5 rounded-lg border shadow-sm', column.bg)}>
          {column.icon}
        </div>
        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-tight">{column.label}</h4>
        <span className="ml-auto text-[10px] font-black bg-white border border-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full shadow-sm">
          {attendeesInCol.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-2 min-h-[50px] overflow-y-auto custom-scrollbar">
        {attendeesInCol.map(att => (
          <AttendeeCard
            key={att.id}
            attendee={att}
            id={att.id}
            onViewDetails={att.lead_id ? () => onAttendeeClick(att) : undefined}
            onRemove={() => onRemoveAttendee(att.id)}
            onCheckIn={att.lead_id ? () => onCheckIn(att) : undefined}
            onNoShow={att.lead_id ? () => onNoShow(att) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
