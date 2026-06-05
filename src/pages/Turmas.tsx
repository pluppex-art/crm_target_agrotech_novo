import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  LayoutGrid,
  LayoutList,
  CheckCheck,
  LogIn,
  UserX,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DndContext, useSensors, useSensor, PointerSensor, closestCenter } from '@dnd-kit/core';
import {
  useDroppable,
  useDraggable,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTurmaStore, Turma, TurmaAttendee, AttendanceStatus } from '../store/useTurmaStore';
import { Loader2, Search } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileStore } from '../store/useProfileStore';

import { UnifiedTurmaProductForm } from '../components/forms/UnifiedTurmaProductForm';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { getSupabaseClient } from '../lib/supabase';
import { Lead } from '../types/leads';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import {
  TURMA_STATUS_LABELS,
  STATUS_COLUMNS,
  fetchLeadById
} from '../lib/turmas';
import { TurmaCard } from '../components/turmas/TurmaCard';
import { TurmasRightPanel } from '../components/turmas/TurmasRightPanel';
import { PageFilters, FilterConfig } from '../components/ui/PageFilters';
import { Filter, User, Package } from 'lucide-react';
import { useLeadStore } from '@/store/useLeadStore';
import { useProductStore } from '@/store/useProductStore';
import { financialCalculator } from '@/services/financialCalculator';
import { ProfessorView } from '../components/turmas/ProfessorView';



export function Turmas() {
  const { hasPermission } = usePermissions();
  const { user } = useAuthStore();
  const { profiles } = useProfileStore();
  const { turmas, fetchTurmas, updateAttendeeStatus, removeTurma, removeAttendee, isLoading, subscribe } = useTurmaStore();
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [isNewTurmaOpen, setIsNewTurmaOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('agendada');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterProfessor, setFilterProfessor] = useState('all');
  const { products, fetchProducts } = useProductStore();
  const [setupRequired] = useState(false);
  const [responsibles, setResponsibles] = useState<{ id: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [activeTab, setActiveTab] = useState<'gestao' | 'professor'>('gestao');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Attendee detail modal
  const { leads, setSelectedLead, selectedLead: storeSelectedLead } = useLeadStore();
  const [selectedAttendeeInfo, setSelectedAttendeeInfo] = useState<{ turmaId: string; attendeeId: string; currentStatus: AttendanceStatus } | null>(null);
  const [loadingAttendeeDetail, setLoadingAttendeeDetail] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'info' | 'turma'>('info');

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    fetchTurmas();
    fetchProducts();
  }, [fetchTurmas, fetchProducts]);

  // Fetch responsibles from perfis (active commercial users)
  useEffect(() => {
    const fetchResponsibles = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('perfis')
        .select('id, name')
        .eq('status', 'active')
        .eq('department', 'Comercial')
        .not('name', 'is', null);
      if (data) {
        setResponsibles(data.filter((p: any) => p.id && p.name).map((p: any) => ({ id: p.id, name: p.name })));
      }
    };
    fetchResponsibles();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, []); // Subscribe once

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  if (!hasPermission('turmas.view')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[600px] text-center">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <GraduationCap className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">Acesso Bloqueado</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
          Você precisa da permissão <code className="bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-300">turmas.view</code> para acessar as turmas.
        </p>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Contate o administrador</p>
      </div>
    );
  }

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !selectedTurma) return;
    const newStatus = over.id as AttendanceStatus;
    const attendeeId = active.id as string;
    updateAttendeeStatus(selectedTurma.id, attendeeId, newStatus);
    setSelectedTurma(prev => {
      if (!prev) return null;
      return {
        ...prev,
        attendees: prev.attendees.map(a =>
          a.id === attendeeId ? { ...a, status: newStatus } : a
        ),
      };
    });
  };

  const handleAttendeeClick = async (attendee: TurmaAttendee, turmaId: string, tab: 'info' | 'turma' = 'info') => {
    if (!attendee.lead_id) return;
    setLoadingAttendeeDetail(true);
    const lead = await fetchLeadById(attendee.lead_id);
    setLoadingAttendeeDetail(false);
    if (lead) {
      setModalInitialTab(tab);
      setSelectedLead(lead);
      setSelectedAttendeeInfo({ turmaId, attendeeId: attendee.id, currentStatus: attendee.status });
    }
  };

  const handleCheckIn = (attendee: TurmaAttendee, turmaId: string) => {
    updateAttendeeStatus(turmaId, attendee.id, 'confirmado');
    handleAttendeeClick({ ...attendee, status: 'confirmado' }, turmaId, 'turma');
  };

  const handleNoShow = (attendee: TurmaAttendee, turmaId: string) => {
    updateAttendeeStatus(turmaId, attendee.id, 'cancelado');
  };

  const liveSelectedTurma = selectedTurma
    ? turmas.find(t => t.id === selectedTurma.id) ?? selectedTurma
    : null;

  const handleToggleConcluida = () => {
    if (!liveSelectedTurma) return;
    const store = useTurmaStore.getState();
    const newStatus = liveSelectedTurma.status === 'concluida' ? 'agendada' : 'concluida';
    store.updateTurma(liveSelectedTurma.id, { status: newStatus });
  };

  const handleToggleCancelada = () => {
    if (!liveSelectedTurma) return;
    const store = useTurmaStore.getState();
    const newStatus = liveSelectedTurma.status === 'cancelada' ? 'agendada' : 'cancelada';
    store.updateTurma(liveSelectedTurma.id, { status: newStatus });
  };

  return (
    <div className="flex h-full bg-[#f3f6f9] dark:bg-transparent overflow-hidden relative">
      {/* Sub-Sidebar Navigation (Settings Style - Collapsible) */}
      <div className="relative flex flex-shrink-0 z-20">
        <motion.aside
          initial={false}
          animate={{ 
            width: isSidebarOpen ? '13rem' : '0rem',
            opacity: isSidebarOpen ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full"
        >
          <div className="w-52 flex flex-col h-full">
            <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Módulos</p>
            </div>
            <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
              <button
                onClick={() => setActiveTab('gestao')}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-xl px-3 h-9 text-sm font-medium transition-all',
                  activeTab === 'gestao'
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 border-transparent'
                )}
              >
                <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-left">Gestão Completa</span>
              </button>
              
              <button
                onClick={() => setActiveTab('professor')}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-xl px-3 h-9 text-sm font-medium transition-all',
                  activeTab === 'professor'
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 border-transparent'
                )}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-left">Área do Professor</span>
              </button>
            </nav>
          </div>
        </motion.aside>

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={cn(
            "absolute top-4 -right-3 z-30 w-6 h-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-md hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all group",
            !isSidebarOpen && "right-[-1.5rem] bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600"
          )}
          title={isSidebarOpen ? "Recolher menu" : "Expandir menu"}
        >
          {isSidebarOpen ? (
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          ) : (
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header - Conditional for Gestão */}
        {activeTab === 'gestao' && (
          <div className="p-4 sm:p-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <GraduationCap className="text-emerald-600 shrink-0" size={26} />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 leading-tight">Turmas</h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gerencie turmas e presenças.</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingTurma(null); setIsNewTurmaOpen(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold text-sm"
            >
              <Plus size={18} />
              <span className="whitespace-nowrap">Nova Turma</span>
            </button>
          </div>
        )}
        {activeTab === 'gestao' ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Panel — Turmas Cards */}
            <div
              key="left-panel"
              className={cn(
                'flex flex-col transition-all duration-300 h-full overflow-hidden',
                liveSelectedTurma ? 'lg:w-[420px] lg:min-w-[420px] hidden lg:flex' : 'flex-1'
              )}
            >
              {/* Filters */}
              <div className="px-4 sm:px-6 mt-4">
                <PageFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Buscar por nome, professor ou produto..."
                  onClearAll={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterProduct('all');
                    setFilterProfessor('all');
                  }}
                  filters={[
                    {
                      id: 'status',
                      type: 'select',
                      icon: Filter,
                      placeholder: 'Todos os Status',
                      value: filterStatus,
                      onChange: setFilterStatus,
                      activeColorClass: 'bg-purple-50 text-purple-700 border-purple-100',
                      options: Object.entries(TURMA_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v.label }))
                    },
                    {
                      id: 'product',
                      type: 'select',
                      icon: Package,
                      placeholder: 'Todos os Produtos',
                      value: filterProduct,
                      onChange: setFilterProduct,
                      activeColorClass: 'bg-amber-50 text-amber-700 border-amber-100',
                      options: Array.from(new Set(products.map(p => p.name))).sort().map(name => ({ value: name, label: name }))
                    },
                    {
                      id: 'professor',
                      type: 'select',
                      icon: User,
                      placeholder: 'Todos os Professores',
                      value: filterProfessor,
                      onChange: setFilterProfessor,
                      activeColorClass: 'bg-teal-50 text-teal-700 border-teal-100',
                      options: Array.from(new Set(turmas.map(t => t.professor_name).filter((p): p is string => !!p))).map(p => ({ value: p, label: p }))
                    }
                  ]}
                />
              </div>

              {/* Cards Grid */}
              <div className="flex-1 overflow-y-auto p-6 pt-2 grid grid-cols-1 gap-4 content-start">
                {isLoading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                    <p>Carregando turmas...</p>
                  </div>
                ) : turmas.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                    <GraduationCap size={48} className="mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma turma cadastrada</p>
                  </div>
                ) : (
                  turmas.filter(t => {
                    // Exclude "Serviços" — services are not turmas
                    const cat = (t.category || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                    if (cat === 'servicos' || cat === 'servico') return false;

                    // 1. Search global (name, professor, product)
                    if (searchTerm.trim()) {
                      const q = searchTerm.toLowerCase();
                      const matchesSearch = (
                        t.name.toLowerCase().includes(q) ||
                        (t.professor_name || '').toLowerCase().includes(q) ||
                        (t.category || '').toLowerCase().includes(q)
                      );
                      if (!matchesSearch) return false;
                    }
                    // 2. Status
                    if (filterStatus !== 'all' && t.status !== filterStatus) return false;

                    // 3. Professor
                    if (filterProfessor !== 'all' && t.professor_name !== filterProfessor) return false;

                    return true;
                  })
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .filter(t => {
                      // 3. Product (by name for visual grouping)
                      if (filterProduct !== 'all' && t.name !== filterProduct) return false;
                      return true;
                    })
                    .map(turma => (
                      <TurmaCard
                        key={turma.id}
                        turma={turma}
                        isSelected={liveSelectedTurma?.id === turma.id}
                        onSelect={(turma: Turma) => setSelectedTurma(selectedTurma?.id === turma.id ? null : turma)}
                        onEdit={(turma: Turma) => {
                          setEditingTurma(turma);
                          setIsNewTurmaOpen(true);
                        }}
                        onDelete={removeTurma}
                      />
                    ))
                )}
              </div>
            </div>

            {/* Right Panel — Attendance Detail & Kanban */}
            <AnimatePresence mode="wait">
              {liveSelectedTurma && (
                <TurmasRightPanel
                  liveSelectedTurma={liveSelectedTurma}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  setSelectedTurma={setSelectedTurma}
                  handleToggleConcluida={handleToggleConcluida}
                  handleToggleCancelada={handleToggleCancelada}
                  activeId={activeId}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  handleAttendeeClick={handleAttendeeClick}
                  removeAttendee={removeAttendee}
                  handleCheckIn={handleCheckIn}
                  handleNoShow={handleNoShow}
                />
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ProfessorView
              turmas={turmas.filter(t => {
                const cat = (t.category || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                return cat !== 'servicos' && cat !== 'servico';
              })}
              currentUserProfile={profiles.find(p => p.id === user?.id)}
            />
          </div>
        )}
      </div>

      {/* Forms & Modals */}
      <UnifiedTurmaProductForm
        isOpen={isNewTurmaOpen}
        onClose={() => { setIsNewTurmaOpen(false); setEditingTurma(null); }}
        mode="turma"
        initialData={editingTurma ?? undefined}
      />

      {/* Loading overlay for attendee detail */}
      {loadingAttendeeDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl flex items-center gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={20} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Carregando dados do cliente...</span>
          </div>
        </div>
      )}

      {/* Attendee Lead Detail Modal */}
      {storeSelectedLead && (
        <LeadDetailsModal
          isOpen={!!storeSelectedLead}
          onClose={() => { setSelectedLead(null); setSelectedAttendeeInfo(null); }}
          lead={leads.find(l => l.id === storeSelectedLead.id) || storeSelectedLead}
          turmaAttendee={selectedAttendeeInfo ?? undefined}
          currentStageId={selectedAttendeeInfo?.currentStatus}
          responsibles={responsibles}
          initialTab={modalInitialTab}
          onTurmaStatusChange={(turmaId: string, attendeeId: string, status: AttendanceStatus) => {
            updateAttendeeStatus(turmaId, attendeeId, status);
            setSelectedAttendeeInfo(prev => prev ? { ...prev, currentStatus: status } : null);
          }}
        />
      )}
    </div>
  );
}




