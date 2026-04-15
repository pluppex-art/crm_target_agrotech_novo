import React from 'react';

import { Star, Phone, Plus, Trash2, Edit2, CheckSquare, AlertTriangle, MoreHorizontal, AlertCircle } from 'lucide-react';
import { useLeadChecklist } from '../../hooks/useLeadChecklist';

import { Lead, LeadSubStatus } from '../../types/leads';
import { cn, getLeadEffectiveValue } from '../../lib/utils';
import { useLeadStore } from '../../store/useLeadStore';
import { getElapsedHours } from '../../services/alertService';


interface LeadCardProps {
  lead: Lead;
  index: number;
  onDoubleClick: () => void;
  columnId: string;
  isDragging?: boolean;
}


export function LeadCard({ lead, index, onDoubleClick, columnId, isDragging }: LeadCardProps) {
  const { updateLeadSubStatus, deleteLead, setSelectedLead } = useLeadStore();
  const elapsedHours = getElapsedHours(lead);
  const isWarning = elapsedHours >= 12 && elapsedHours < 18 && lead.status !== 'closed';
  const isDanger = elapsedHours >= 18 && lead.status !== 'closed';

  const { allRequiredCompleted, requiredCompleted, requiredTotal } = useLeadChecklist({
    leadId: lead.id,
    stageId: lead.stage_id || columnId,
  });


  return (
    <div
      onDoubleClick={onDoubleClick}
      className={cn(
        "bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative",
        isDragging ? "shadow-xl border-emerald-500 rotate-2" : "",
        isDanger ? "border-red-200 hover:border-red-300" : isWarning ? "border-amber-200 hover:border-amber-300" : "hover:border-emerald-200"
      )}
    >
  {/* Inactivity badge */}
  {(isWarning || isDanger) && (
    <div className={cn(
      "absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
      isDanger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
    )}>
      <AlertTriangle size={9} />
      {elapsedHours}h
    </div>
  )}

  {/* Checklist badge */}
  {requiredTotal > 0 && !allRequiredCompleted && (
    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">
      <AlertCircle size={9} />
      {requiredCompleted}/{requiredTotal}
    </div>
  )}



      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={lead.photo || 'https://via.placeholder.com/150'}
              alt={lead.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-50 shadow-sm"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-800 text-sm leading-tight">{lead.name}</h4>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={10}
                  className={cn(
                    i < (lead.stars || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <button className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Card Body */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-slate-500">
          <Phone size={14} className="text-emerald-500" />
          <span className="text-xs font-medium">{lead.phone}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500">
            <Plus size={14} className="text-slate-300" />
            <span className="text-xs font-medium">{lead.product}</span>
          </div>
          {lead.responsible && (
            <div className="flex items-center gap-1.5 pl-4 text-xs text-slate-400">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
              <span className="font-medium">{lead.responsible}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-slate-800">
            R$ {getLeadEffectiveValue(lead).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}
              className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-slate-100"
              title="Excluir lead"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
              className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-100"
            >
              <Edit2 size={14} />
            </button>
            <button className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-100">
              <CheckSquare size={14} />
            </button>
          </div>
        </div>
      </div>

      {lead.status === 'qualified' && (
        <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-2">
          {[
            { id: 'qualified' as LeadSubStatus, label: 'Qualificado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
            { id: 'warming' as LeadSubStatus, label: 'Aquecimento', color: 'bg-amber-50 text-amber-600 border-amber-100' },
            { id: 'disqualified' as LeadSubStatus, label: 'Desqualificado', color: 'bg-red-50 text-red-600 border-red-100' }
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={(e) => { e.stopPropagation(); updateLeadSubStatus(lead.id, sub.id); }}
              className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-full border transition-all",
                lead.subStatus === sub.id
                  ? sub.color
                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
              )}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

