import { useEffect, useState } from 'react';
import { Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTaskStore } from '../store/useTaskStore';
import { NewTaskModal } from '../components/tasks/NewTaskModal';
import { CalendarView } from '../components/tasks/CalendarView';
import { ViewToggle } from '../components/tasks/ViewToggle';
import { TaskItem } from '../components/tasks/TaskItem';

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Minhas Tarefas</h1>
          <p className="text-sm text-slate-500">Acompanhe suas atividades diárias.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
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
                <TaskItem 
                  key={task.id}
                  task={task}
                  onToggleStatus={handleToggleStatus}
                  onDelete={deleteTask}
                />
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
