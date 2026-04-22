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



export function Turmas() {
  const { hasPermission } = usePermissions();
  const { turmas, fetchTurmas, updateAttendeeStatus, removeTurma, removeAttendee, isLoading, subscribe } = useTurmaStore();
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [isNewTurmaOpen, setIsNewTurmaOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterProfessor, setFilterProfessor] = useState('all');
  const [setupRequired] = useState(false);
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

  // Attendee detail modal
  const { leads, setSelectedLead, selectedLead: storeSelectedLead } = useLeadStore();
  const [selectedAttendeeInfo, setSelectedAttendeeInfo] = useState<{ turmaId: string; attendeeId: string; currentStatus: AttendanceStatus } | null>(null);
  const [loadingAttendeeDetail, setLoadingAttendeeDetail] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'info' | 'turma'>('info');

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  // Fetch distinct responsibles directly from the database
  useEffect(() => {
    const fetchResponsibles = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('leads')
        .select('responsible')
        .not('responsible', 'is', null)
        .neq('responsible', '');
      if (data) {
        const unique = Array.from(new Set(data.map((r: any) => r.responsible).filter(Boolean))) as string[];
        setResponsibles(unique);
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
        <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <GraduationCap className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Acesso Bloqueado</h2>
        <p className="text-slate-500 max-w-md mb-4 leading-relaxed">
          Você precisa da permissão <code className="bg-slate-100 px-2 py-1 rounded-lg text-sm font-mono text-slate-700">turmas.view</code> para acessar as turmas.
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



  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#f3f6f9] overflow-hidden relative">
      {/* Left Panel — Turmas Cards */}
      <div
        key="left-panel"
        className={cn(
          'flex flex-col transition-all duration-300 h-full overflow-hidden',
          liveSelectedTurma ? 'lg:w-[420px] lg:min-w-[420px] hidden lg:flex' : 'flex-1'
        )}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 pb-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="text-emerald-600 shrink-0" size={26} />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">Turmas</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Gerencie turmas e presenças.</p>
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

        {/* Filters */}
        <div className="px-4 sm:px-6">
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
                options: Array.from(new Set(turmas.map(t => t.product_name).filter(Boolean))).map(p => ({ value: p, label: p }))
              },
              {
                id: 'professor',
                type: 'select',
                icon: User,
                placeholder: 'Todos os Professores',
                value: filterProfessor,
                onChange: setFilterProfessor,
                activeColorClass: 'bg-teal-50 text-teal-700 border-teal-100',
                options: Array.from(new Set(turmas.map(t => t.professor_name).filter(Boolean))).map(p => ({ value: p, label: p }))
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
          ) : setupRequired ? (
            <div className="col-span-full">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="text-amber-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-amber-900 mb-2">Configuração Necessária</h3>
                <p className="text-sm text-amber-700 max-w-md mb-6">
                  A tabela de turmas ainda não foi criada no seu banco de dados Supabase.
                  Para corrigir isso e ativar este módulo, siga as instruções abaixo:
                </p>
                <div className="bg-white border border-amber-100 rounded-xl p-4 text-left w-full max-w-lg mb-6 shadow-sm">
                  <ol className="list-decimal list-inside space-y-3 text-xs text-slate-600">
                    <li>Abra o arquivo <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">turmas_schema.sql</code> e copie o conteúdo.</li>
                    <li>Vá ao seu <strong>Dashboard do Supabase</strong>.</li>
                    <li>Acesse o <strong>SQL Editor</strong> e crie uma <strong>New Query</strong>.</li>
                    <li>Cole o código e clique em <strong>Run</strong>.</li>
                  </ol>
                </div>
                <button
                  onClick={() => fetchTurmas()}
                  className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-md"
                >
                  Já executei o SQL, verificar agora
                </button>
              </div>
            </div>
          ) : turmas.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <GraduationCap size={48} className="mb-3 opacity-30" />
              <p className="font-medium">Nenhuma turma cadastrada</p>
            </div>
          ) : (
            turmas.filter(t => {
              // 1. Search global (name, professor, product)
              if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchesSearch = (
                  t.name.toLowerCase().includes(q) ||
                  (t.professor_name || '').toLowerCase().includes(q) ||
                  t.product_name.toLowerCase().includes(q)
                );
                if (!matchesSearch) return false;
              }
              // 2. Status
              if (filterStatus !== 'all' && t.status !== filterStatus) return false;
              // 3. Product
              if (filterProduct !== 'all' && t.product_name !== filterProduct) return false;
              // 4. Professor
              if (filterProfessor !== 'all' && t.professor_name !== filterProfessor) return false;
              return true;
            }).map(turma => (
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
          <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={20} />
            <span className="text-sm font-medium text-slate-700">Carregando dados do cliente...</span>
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




