import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Plus, Settings, Loader2, Trash2, LayoutList, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTaskStore } from '../store/useTaskStore';
import { NewTaskModal } from '../components/tasks/NewTaskModal';
import { CalendarView } from '../components/tasks/CalendarView';

export function Tasks() {
  const { tasks, loading, fetchTasks, updateTaskStatus, deleteTask } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleStatus = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    updateTaskStatus(taskId, newStatus);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Minhas Tarefas</h1>
          <p className="text-sm text-slate-500">Acompanhe suas atividades diárias e compromissos.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutList className="w-4 h-4" />
              Lista
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all",
                viewMode === 'calendar' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendário
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  className={cn(
                    "bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all",
                    task.status === 'completed' && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleToggleStatus(task.id, task.status)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        task.status === 'completed' 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "border-slate-200 hover:border-emerald-500"
                      )}
                    >
                      {task.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <div>
                      <h3 className={cn("text-sm font-bold text-slate-800", task.status === 'completed' && "line-through")}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                          <Clock className="w-3 h-3" />
                          {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem data'}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                          task.priority === 'high' ? "bg-red-50 text-red-600" :
                          task.priority === 'medium' ? "bg-yellow-50 text-yellow-600" :
                          "bg-blue-50 text-blue-600"
                        )}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-slate-300 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-300 hover:text-slate-600">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma tarefa encontrada.</p>
                </div>
              )}
            </div>
          ) : (
            <CalendarView tasks={tasks} onToggleStatus={handleToggleStatus} />
          )}
        </>
      )}

      <NewTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
