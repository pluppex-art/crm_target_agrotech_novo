import { cn } from '../../lib/utils';
import { CheckCircle2, Clock, Trash2, Settings, Tag, User } from 'lucide-react';

interface TaskItemProps {
  task: any;
  onToggleStatus: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}

export function TaskItem({ task, onToggleStatus, onDelete }: TaskItemProps) {
  const handleToggle = () => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    onToggleStatus(task.id, newStatus);
  };

  const isActivity = task.category && task.category !== 'Geral';

  return (
    <div
      className={cn(
        "bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all",
        task.status === 'completed' && "opacity-60"
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          onClick={handleToggle}
          className={cn(
            "w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all",
            task.status === 'completed'
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-slate-200 hover:border-emerald-500"
          )}
        >
          {task.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn("text-sm font-bold text-slate-800 truncate", task.status === 'completed' && "line-through")}>
              {task.title}
            </h3>
            {isActivity && (
              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100">
                <Tag className="w-2.5 h-2.5" />
                {task.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {task.due_date && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                <Clock className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('pt-BR')}
                {task.scheduled_time && (
                  <span className="ml-0.5">às {task.scheduled_time}</span>
                )}
              </span>
            )}
            {task.lead_name && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                <User className="w-3 h-3" />
                {task.lead_name}
              </span>
            )}
            <span className={cn(
              "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
              task.priority === 'high' ? "bg-red-50 text-red-600" :
              task.priority === 'medium' ? "bg-yellow-50 text-yellow-600" :
              "bg-blue-50 text-blue-600"
            )}>
              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 text-slate-300 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button className="p-2 text-slate-300 hover:text-slate-600">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
