import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TurmaAttendee } from '../../store/useTurmaStore';
import { STATUS_COLUMNS } from '../../lib/turmas';

import { AttendeeCard } from './AttendeeCard';
import { cn } from '../../lib/utils';

interface TurmaColumnProps {
  column: typeof STATUS_COLUMNS[number];
  attendees: TurmaAttendee[];
  onAttendeeClick: (att: TurmaAttendee) => void;
  onRemoveAttendee: (attId: string) => void;
  onCheckIn: (att: TurmaAttendee) => void;
  onNoShow: (att: TurmaAttendee) => void;
}

export function TurmaColumn({ 
  column, 
  attendees, 
  onAttendeeClick, 
  onRemoveAttendee, 
  onCheckIn, 
  onNoShow 
}: TurmaColumnProps) {
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
              onCheckIn={att.lead_id ? () => onCheckIn(att) : undefined}
              onNoShow={att.lead_id ? () => onNoShow(att) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

