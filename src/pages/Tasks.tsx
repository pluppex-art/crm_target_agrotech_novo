import { useEffect, useState } from 'react';
import { Plus, Loader2, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useTaskStore } from '../store/useTaskStore';
import { NewActivityModal } from '../components/tasks/NewActivityModal';
import { CalendarView } from '../components/tasks/CalendarView';
import { ViewToggle } from '../components/tasks/ViewToggle';
import { TaskItem } from '../components/tasks/TaskItem';
import { cn } from '../lib/utils';

export function Tasks() {
  const { hasPermission } = usePermissions();
  const { tasks, loading, fetchTasks, updateTaskStatus, deleteTask, subscribe } = useTaskStore();
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleStatus = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    updateTaskStatus(taskId, newStatus);
  };

  if (!hasPermission('tasks.view')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[600px] text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Acesso Bloqueado</h2>
        <p className="text-slate-500 max-w-md mb-4 leading-relaxed">
          Você precisa da permissão <code className="bg-slate-100 px-2 py-1 rounded-lg text-sm font-mono text-slate-700">tasks.view</code> para acessar as tarefas.
        </p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Contate o administrador</p>
      </div>
    );
  }

  const categories = Array.from(
    new Set(tasks.map(t => t.category).filter(Boolean))
  ).sort() as string[];

  const filteredTasks = categoryFilter === 'all'
    ? tasks
    : tasks.filter(t => t.category === categoryFilter);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Minhas Tarefas</h1>
          <p className="text-sm text-slate-500">Acompanhe suas atividades diárias.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
          {hasPermission('tasks.create') && (
            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nova Atividade
            </button>
          )}
        </div>
      </div>

      {/* Category filter bar */}
      {categories.length > 0 && viewMode === 'list' && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
              categoryFilter === 'all'
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
            )}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                categoryFilter === cat
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleStatus={handleToggleStatus}
                  onDelete={hasPermission('tasks.delete') ? deleteTask : undefined}
                />
              ))}
              {filteredTasks.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-sm">Nenhuma atividade encontrada.</p>
                </div>
              )}
            </div>
          ) : (
            <CalendarView tasks={tasks} onToggleStatus={handleToggleStatus} />
          )}
        </>
      )}

      <NewActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onCreated={() => fetchTasks()}
      />
    </div>
  );
}
