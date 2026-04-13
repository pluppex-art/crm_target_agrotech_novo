import React, { useState } from 'react';
import { Plus, Loader2, CheckSquare } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { NewActivityModal } from '../../tasks/NewActivityModal';

interface LeadTasksTabProps {
  leadTasks: any[];
  loadingTasks: boolean;
  handleToggleTask: (taskId: string, status: string) => Promise<void>;
  loadTasks?: () => Promise<void>;
  leadId?: string;
  leadName?: string;
}

export const LeadTasksTab: React.FC<LeadTasksTabProps> = ({
  leadTasks,
  loadingTasks,
  handleToggleTask,
  loadTasks,
  leadId,
  leadName,
}) => {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atividades do Lead</label>
        <button
          onClick={() => setIsActivityModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
        >
          <Plus size={14} />
          Nova Atividade
        </button>
      </div>

      <div className="space-y-3">
        {loadingTasks ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-emerald-600 w-6 h-6" />
          </div>
        ) : leadTasks.length > 0 ? (
          leadTasks.map((task: any) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                task.status === 'completed'
                  ? "bg-slate-50 border-slate-100 opacity-60"
                  : "bg-white border-slate-100 hover:border-emerald-200 shadow-sm"
              )}
              onClick={() => handleToggleTask(task.id, task.status)}
            >
              <div className={cn(
                "w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all",
                task.status === 'completed'
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-slate-200 group-hover:border-emerald-300"
              )}>
                {task.status === 'completed' && <CheckSquare size={14} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-sm font-medium block truncate",
                  task.status === 'completed' ? "line-through text-slate-400" : "text-slate-700"
                )}>
                  {task.title}
                </span>
                {(task.category || task.due_date || task.scheduled_time) && (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.category && task.category !== 'Geral' && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                        {task.category}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        {task.scheduled_time && ` às ${task.scheduled_time}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhuma atividade registrada.</p>
          </div>
        )}
      </div>

      <NewActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        leadId={leadId}
        leadName={leadName}
        onCreated={loadTasks}
      />
    </div>
  );
};
