import { useEffect, useState } from 'react';
import { Plus, Loader2, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useTaskStore } from '../store/useTaskStore';
import { NewActivityModal } from '../components/tasks/NewActivityModal';
import { CalendarView } from '../components/tasks/CalendarView';
import { ViewToggle } from '../components/tasks/ViewToggle';
import { TaskItem } from '../components/tasks/TaskItem';
import { cn } from '../lib/utils';
import { PageFilters } from '../components/ui/PageFilters';
import { Filter, Bookmark } from 'lucide-react';

export function Tasks() {
  const { hasPermission } = usePermissions();
  const { tasks, loading, fetchTasks, updateTaskStatus, deleteTask, subscribe } = useTaskStore();
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredTasks = tasks.filter(t => {
    // 1. Search global
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesSearch = (
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;
    }
    // 2. Status
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    // 3. Category
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

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

      {/* Filter bar */}
      {viewMode === 'list' && (
        <div className="mb-5">
          <PageFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar por título ou descrição..."
            onClearAll={() => {
              setSearchTerm('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            filters={[
              {
                id: 'status',
                type: 'select',
                icon: Filter,
                placeholder: 'Todos os Status',
                value: statusFilter,
                onChange: setStatusFilter,
                activeColorClass: 'bg-purple-50 text-purple-700 border-purple-100',
                options: [
                  { value: 'pending', label: 'Pendente' },
                  { value: 'completed', label: 'Concluída' }
                ]
              },
              {
                id: 'category',
                type: 'select',
                icon: Bookmark,
                placeholder: 'Todas as Categorias',
                value: categoryFilter,
                onChange: setCategoryFilter,
                activeColorClass: 'bg-amber-50 text-amber-700 border-amber-100',
                options: categories.map(c => ({ value: c, label: c }))
              }
            ]}
          />
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
