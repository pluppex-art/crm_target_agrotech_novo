import React from 'react';
import { Calendar, Clock, MapPin, Package, Users, Edit2, Trash2 } from 'lucide-react';
import { Turma } from '../../store/useTurmaStore';
import { totalVendasTurma, TURMA_STATUS_LABELS } from '../../lib/turmas';

import { cn } from '../../lib/utils';

interface TurmaCardProps {
  turma: Turma;
  isSelected: boolean;
  onSelect: (turma: Turma) => void;
  onEdit: (turma: Turma) => void;
  onDelete: (turmaId: string) => void;
}

export function TurmaCard({ turma, isSelected, onSelect, onEdit, onDelete }: TurmaCardProps) {
  const confirmados = (turma.attendees || []).filter(a => a.status === 'confirmado').length;
  const st = TURMA_STATUS_LABELS[turma.status] || TURMA_STATUS_LABELS.agendada;

  return (
    <div
      onClick={() => onSelect(turma)}
      className={cn(
        'relative overflow-hidden bg-white rounded-2xl p-5 border cursor-pointer transition-all shadow-sm hover:shadow-md group',
        isSelected ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-100 hover:border-emerald-200',
        turma.status === 'concluida' ? 'border-emerald-300' : ''
      )}
    >
      {/* Faixa em formato de X */}
      {turma.status === 'concluida' && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <div className="absolute w-[150%] bg-emerald-500/90 text-white font-black text-sm tracking-[0.3em] uppercase text-center py-1.5 -rotate-[22deg] shadow-md backdrop-blur-sm">
            Turma Concluída
          </div>
          <div className="absolute w-[150%] bg-emerald-500/90 text-white font-black text-sm tracking-[0.3em] uppercase text-center py-1.5 rotate-[22deg] shadow-md backdrop-blur-sm">
            Turma Concluída
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-3 relative z-30">
        <div className="flex-1">
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full', 
            turma.status === 'concluida' ? 'bg-emerald-100 text-emerald-700' : st.color
          )}>
            {st.label}
          </span>
          <h3 className="font-bold text-slate-800 mt-2 leading-tight">{turma.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{turma.professor_name || 'Sem professor'}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onEdit(turma); }}
            className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors bg-white/80 backdrop-blur-sm"
            title="Editar turma"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(turma.id); }}
            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors bg-white/80 backdrop-blur-sm"
            title="Excluir turma"
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
}


