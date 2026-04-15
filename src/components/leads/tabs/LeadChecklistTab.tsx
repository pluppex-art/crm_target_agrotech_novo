import React from 'react';
import { CheckSquare, Loader2, ClipboardList, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ChecklistItemWithState } from '../../../hooks/useLeadChecklist';

interface LeadChecklistTabProps {
  items: ChecklistItemWithState[];
  loading: boolean;
  toggle: (itemId: string) => Promise<void>;
  allRequiredCompleted: boolean;
  completedCount: number;
  totalCount: number;
  requiredTotal: number;
  requiredCompleted: number;
}

export const LeadChecklistTab: React.FC<LeadChecklistTabProps> = ({
  items,
  loading,
  toggle,
  allRequiredCompleted,
  completedCount,
  totalCount,
  requiredTotal,
  requiredCompleted,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="animate-spin text-emerald-600 w-6 h-6" />
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <ClipboardList className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm font-medium">Nenhum item configurado para esta etapa</p>
        <p className="text-xs mt-1 text-slate-300">
          Configure em Configurações → Checklists
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header com progresso */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Checklist da Etapa
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Marque os itens concluídos para avançar de etapa
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
          allRequiredCompleted
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        )}>
          {allRequiredCompleted
            ? <CheckSquare size={13} />
            : <AlertCircle size={13} />
          }
          {requiredCompleted}/{requiredTotal} obrigatórios
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            allRequiredCompleted ? "bg-emerald-500" : "bg-amber-400"
          )}
          style={{ width: requiredTotal > 0 ? `${(requiredCompleted / requiredTotal) * 100}%` : '0%' }}
        />
      </div>

      {/* Lista de itens */}
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all group",
              item.completed
                ? "bg-emerald-50 border-emerald-200"
                : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 shadow-sm"
            )}
          >
            {/* Checkbox visual */}
            <div className={cn(
              "w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all",
              item.completed
                ? "bg-emerald-500 border-emerald-500"
                : "border-slate-300 group-hover:border-emerald-400"
            )}>
              {item.completed && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Nome do item */}
            <span className={cn(
              "flex-1 text-sm font-medium transition-colors",
              item.completed ? "text-emerald-700 line-through decoration-emerald-300" : "text-slate-700"
            )}>
              {item.name}
            </span>

            {/* Badge obrigatório */}
            {item.required && !item.completed && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                Obrigatório
              </span>
            )}
            {item.completed && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                Feito
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Aviso de bloqueio */}
      {!allRequiredCompleted && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium leading-relaxed">
            Conclua todos os itens obrigatórios para poder avançar este lead para a próxima etapa.
          </p>
        </div>
      )}
    </div>
  );
};
