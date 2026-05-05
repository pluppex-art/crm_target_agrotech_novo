import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Loader2, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useTaskStore } from '../store/useTaskStore';
import { NewActivityModal } from '../components/tasks/NewActivityModal';
import { CalendarView } from '../components/tasks/CalendarView';
import { ViewToggle } from '../components/tasks/ViewToggle';
import { TaskItem } from '../components/tasks/TaskItem';
import { cn } from '../lib/utils';
import { PageFilters } from '../components/ui/PageFilters';
import { Filter, Bookmark, CheckCircle2, Circle, Clock, ChevronDown, User, Calendar, AlertTriangle } from 'lucide-react';
import { useProfileStore } from '../store/useProfileStore';
import { useAuthStore } from '../store/useAuthStore';

export function Tasks() {
  const { hasPermission } = usePermissions();
  const { user } = useAuthStore();
  const { profiles } = useProfileStore();
  const { tasks, loading, fetchTasks, updateTaskStatus, deleteTask, subscribe } = useTaskStore();
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const currentUserProfile = profiles.find(p => p.id === user?.id);
  const isAdmin = hasPermission('admin.all') || 
                  currentUserProfile?.cargos?.name?.toLowerCase().includes('admin') ||
                  currentUserProfile?.cargos?.name?.toLowerCase().includes('coordenador');

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
    // 0. Permission check: users only see their own tasks unless admin
    if (!isAdmin && t.responsible !== currentUserProfile?.name) return false;

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
    // 4. Priority
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    // 5. Responsible (Admin only)
    if (isAdmin && responsibleFilter !== 'all' && t.responsible !== responsibleFilter) return false;
    
    // 6. Date Range
    if (dateFilter !== 'all') {
      if (!t.due_date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(t.due_date + 'T00:00:00');
      
      if (dateFilter === 'today') {
        if (taskDate.getTime() !== today.getTime()) return false;
      } else if (dateFilter === 'overdue') {
        if (taskDate.getTime() >= today.getTime() || t.status === 'completed') return false;
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        if (taskDate.getTime() !== tomorrow.getTime()) return false;
      }
    }
    return true;
  });

  const pendingCount = filteredTasks.filter(t => t.status === 'pending').length;
  const completedCount = filteredTasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isAdmin ? 'Gerenciamento de Tarefas' : 'Minhas Tarefas'}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Clock size={14} className="text-slate-400" />
              {pendingCount} pendentes
            </p>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {completedCount} concluídas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
          {hasPermission('tasks.create') && (
            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Nova Atividade
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      {viewMode === 'list' && (
        <div className="mb-6">
          <PageFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar por título ou descrição..."
            onClearAll={() => {
              setSearchTerm('');
              setCategoryFilter('all');
              setStatusFilter('all');
              setPriorityFilter('all');
              setResponsibleFilter('all');
              setDateFilter('all');
            }}
            filters={[
              {
                id: 'status',
                type: 'select',
                icon: CheckCircle2,
                placeholder: 'Status',
                value: statusFilter,
                onChange: setStatusFilter,
                activeColorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                options: [
                  { value: 'pending', label: 'Pendente' },
                  { value: 'completed', label: 'Concluída' }
                ]
              },
              {
                id: 'date',
                type: 'select',
                icon: Calendar,
                placeholder: 'Período',
                value: dateFilter,
                onChange: setDateFilter,
                activeColorClass: 'bg-blue-50 text-blue-700 border-blue-100',
                options: [
                  { value: 'today', label: 'Hoje' },
                  { value: 'tomorrow', label: 'Amanhã' },
                  { value: 'overdue', label: 'Atrasadas' }
                ]
              },
              {
                id: 'priority',
                type: 'select',
                icon: AlertTriangle,
                placeholder: 'Prioridade',
                value: priorityFilter,
                onChange: setPriorityFilter,
                activeColorClass: 'bg-red-50 text-red-700 border-red-100',
                options: [
                  { value: 'high', label: 'Alta' },
                  { value: 'medium', label: 'Média' },
                  { value: 'low', label: 'Baixa' }
                ]
              },
              isAdmin ? {
                id: 'responsible',
                type: 'select',
                icon: User,
                placeholder: 'Closer',
                value: responsibleFilter,
                onChange: setResponsibleFilter,
                activeColorClass: 'bg-purple-50 text-purple-700 border-purple-100',
                options: Array.from(new Set(tasks.map(t => t.responsible).filter(Boolean))).map(r => ({ value: r!, label: r! }))
              } : null,
              {
                id: 'category',
                type: 'select',
                icon: Bookmark,
                placeholder: 'Categoria',
                value: categoryFilter,
                onChange: setCategoryFilter,
                activeColorClass: 'bg-amber-50 text-amber-700 border-amber-100',
                options: categories.map(c => ({ value: c, label: c }))
              }
            ].filter((f): f is any => f !== null)}
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
