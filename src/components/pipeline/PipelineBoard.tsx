import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { LeadCard } from './LeadCard';
import { cn } from '../../lib/utils';
import { getLeadEffectiveValue } from '../../lib/utils';
import type { Lead } from '../../types/leads';

function DroppableArea({
  id,
  children,
  isMinimized,
}: {
  id: string;
  children: React.ReactNode;
  isMinimized: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 transition-colors rounded-xl p-1 overflow-y-auto',
        isOver ? 'bg-emerald-50/50' : '',
        isMinimized
          ? 'min-h-[100px] flex flex-col items-center w-full'
          : 'space-y-3 min-h-[150px]'
      )}
      style={{ scrollbarWidth: 'thin' }}
    >
      {children}
    </div>
  );
}

function DraggableCard({
  lead,
  index,
  onDoubleClick,
  columnId,
}: {
  lead: Lead;
  index: number;
  onDoubleClick: () => void;
  columnId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { columnId, lead },
  });

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? {
              transform: CSS.Translate.toString(transform),
              opacity: isDragging ? 0.4 : 1,
              zIndex: isDragging ? 999 : undefined,
            }
          : undefined
      }
      {...attributes}
      {...listeners}
    >
      <LeadCard
        lead={lead}
        index={index}
        onDoubleClick={onDoubleClick}
        columnId={columnId}
        isDragging={isDragging}
      />
    </div>
  );
}

interface PipelineBoardProps {
  filteredLeads: Lead[];
  columns: { id: string; title: string; color: string }[];
  selectedStatus: string | 'all';
  minimizedColumns: Set<string>;
  toggleColumnMinimized: (colId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onLeadDoubleClick: (lead: Lead) => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  filteredLeads,
  columns,
  selectedStatus,
  minimizedColumns,
  toggleColumnMinimized,
  onDragEnd,
  onLeadDoubleClick,
}) => {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const visibleColumns =
    selectedStatus === 'all'
      ? columns
      : columns.filter((col) => col.id === selectedStatus);


  const handleDragStart = (event: DragStartEvent) => {
    const lead = filteredLeads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    onDragEnd(event);
  };

  return (

    <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 min-w-0 flex flex-col w-full max-w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-6 overflow-x-auto p-6 pb-5 flex-1 min-h-0 min-w-0 w-full"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#6ee7b7 #f0fdf4' }}
        >
          {visibleColumns.map((column) => {
            const columnLeads = filteredLeads.filter(
              (l) => (l.stage_id || columns[0]?.id) === column.id
            );
            const columnSum = columnLeads.reduce(
              (sum, l) => sum + getLeadEffectiveValue(l),
              0
            );
            const isMinimized = minimizedColumns.has(column.id);

            return (
              <div
                key={column.id}
                className={cn(
                  'flex flex-col bg-gray-50/50 rounded-2xl p-4 border border-gray-200/60 h-full max-h-full transition-all duration-300',
                  isMinimized
                    ? 'min-w-[56px] w-[56px] p-2 items-center'
                    : 'min-w-[320px] w-[320px]'
                )}
              >
                {!isMinimized ? (
                  <div className="flex items-center justify-between mb-4 px-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full shrink-0',
                          column.color.startsWith('bg-') ? column.color : ''
                        )}
                        style={{
                          backgroundColor: column.color.startsWith('bg-')
                            ? undefined
                            : column.color,
                        }}
                      />
                      <div className="flex flex-col gap-0.5">
                        <h3
                          className="font-bold text-gray-700 text-sm flex items-center gap-2 cursor-pointer hover:text-emerald-600 transition-colors"
                          onClick={() => toggleColumnMinimized(column.id)}
                        >
                          {column.title}
                        </h3>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">
                          R${' '}
                          {columnSum.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {columnLeads.length}
                      </span>
                      <button
                        className="p-1.5 bg-white border border-gray-200 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
                        title={`Adicionar lead em ${column.title}`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleColumnMinimized(column.id)}
                        className="p-1.5 text-gray-400 hover:bg-white rounded-lg hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
                        title="Minimizar seção"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 shrink-0 h-full w-full py-2">
                    <button
                      onClick={() => toggleColumnMinimized(column.id)}
                      className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm flex-shrink-0"
                      title="Expandir seção"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    <div
                      className={cn(
                        'w-2.5 h-2.5 rounded-full shrink-0 flex-shrink-0',
                        column.color.startsWith('bg-') ? column.color : ''
                      )}
                      style={{
                        backgroundColor: column.color.startsWith('bg-')
                          ? undefined
                          : column.color,
                      }}
                    />
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {columnLeads.length}
                    </span>
                    <div className="mt-4 flex-1 flex justify-center w-full relative">
                      <div className="absolute top-0 flex items-center justify-center h-full">
                        <span
                          className="text-xs font-bold text-gray-500 whitespace-nowrap flex items-center gap-2"
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                          }}
                        >
                          {column.title}
                          <span className="text-emerald-500 bg-emerald-50/50 px-1 rounded">
                            R${' '}
                            {columnSum.toLocaleString('pt-BR', {
                              minimumFractionDigits: 0,
                            })}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <DroppableArea id={column.id} isMinimized={isMinimized}>
                  {!isMinimized &&
                    columnLeads.map((lead, index) => (
                      <DraggableCard
                        key={lead.id}
                        lead={lead}
                        index={index}
                        onDoubleClick={() => onLeadDoubleClick(lead)}
                        columnId={column.id}
                      />
                    ))}
                </DroppableArea>
              </div>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div className="rotate-2 shadow-2xl">
              <LeadCard
                lead={activeLead}
                index={0}
                onDoubleClick={() => {}}
                columnId=""
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
