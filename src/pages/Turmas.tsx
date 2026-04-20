import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  Package,
  Users,
  DollarSign,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Trash2,
  Edit2,
  BookOpen,
  Search,
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
  DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTurmaStore, Turma, TurmaAttendee, AttendanceStatus } from '../store/useTurmaStore';
import { Loader2 } from 'lucide-react';
import { UnifiedTurmaProductForm } from '../components/forms/UnifiedTurmaProductForm';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { Lead } from '../types/leads';
import { getSupabaseClient } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

// ── Column definitions — order: matriculado → cancelado → indeciso → confirmado ──
const STATUS_COLUMNS: { id: AttendanceStatus; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { id: 'matriculado', label: 'Matriculado', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <BookOpen size={14} className="text-blue-600" /> },
  { id: 'cancelado', label: 'Cancelado', color: 'text-red-500', bg: 'bg-red-50 border-red-200', icon: <XCircle size={14} className="text-red-500" /> },
  { id: 'indeciso', label: 'Indeciso', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <HelpCircle size={14} className="text-amber-600" /> },
  { id: 'confirmado', label: 'Confirmado', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={14} className="text-emerald-600" /> },
];

const TURMA_STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <Calendar size={12} /> },
  em_andamento: { label: 'Em Andamento', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <Clock size={12} /> },
  concluida: { label: 'Concluída', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <CheckCheck size={12} /> },
  cancelada: { label: 'Cancelada', color: 'bg-red-50 text-red-600 border-red-100', icon: <XCircle size={12} /> },
};

const STATUS_STRIPE: Record<string, string> = {
  agendada: 'bg-gradient-to-b from-blue-400 to-blue-600',
  em_andamento: 'bg-gradient-to-b from-emerald-400 to-emerald-600',
  concluida: 'bg-gradient-to-b from-slate-300 to-slate-400',
  cancelada: 'bg-gradient-to-b from-red-400 to-red-600',
};

// ── Fetch a full Lead from Supabase by id ────────────────────────────────────
async function fetchLeadById(leadId: string): Promise<Lead | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (error) { console.error('Error fetching lead:', error); return null; }
  return data as Lead;
}

export function Turmas() {
  const { hasPermission } = usePermissions();
  const { turmas, fetchTurmas, updateAttendeeStatus, updateTurma, removeTurma, removeAttendee, isLoading, subscribe } = useTurmaStore();
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [isNewTurmaOpen, setIsNewTurmaOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [setupRequired] = useState(false);
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

  // Attendee detail modal
  const [selectedAttendeeLead, setSelectedAttendeeLead] = useState<Lead | null>(null);
  const [selectedAttendeeInfo, setSelectedAttendeeInfo] = useState<{ turmaId: string; attendeeId: string; currentStatus: AttendanceStatus } | null>(null);
  const [loadingAttendeeDetail, setLoadingAttendeeDetail] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'info' | 'turma'>('info');

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

  const onDragEnd = (event: DragEndEvent) => {
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
      setSelectedAttendeeLead(lead);
      setSelectedAttendeeInfo({ turmaId, attendeeId: attendee.id, currentStatus: attendee.status });
    }
  };

  const handleCheckIn = (attendee: TurmaAttendee, turmaId: string) => {
    updateAttendeeStatus(turmaId, attendee.id, 'confirmado');
    setSelectedTurma(prev => prev ? {
      ...prev,
      attendees: prev.attendees.map(a => a.id === attendee.id ? { ...a, status: 'confirmado' } : a),
    } : null);
    handleAttendeeClick({ ...attendee, status: 'confirmado' }, turmaId, 'turma');
  };

  const handleNoShow = (attendee: TurmaAttendee, turmaId: string) => {
    updateAttendeeStatus(turmaId, attendee.id, 'cancelado');
    setSelectedTurma(prev => prev ? {
      ...prev,
      attendees: prev.attendees.map(a => a.id === attendee.id ? { ...a, status: 'cancelado' } : a),
    } : null);
  };

  const handleMarkConcluida = () => {
    if (!liveSelectedTurma) return;
    updateTurma(liveSelectedTurma.id, { status: 'concluida' });
  };

  const liveSelectedTurma = selectedTurma
    ? turmas.find(t => t.id === selectedTurma.id) ?? selectedTurma
    : null;

  const totalVendasTurma = (t: Turma) =>
    t.attendees.reduce((acc, a) => acc + a.vendas, 0);



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

        {/* Search */}
        <div className="px-4 sm:px-6 pb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, professor ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 shadow-sm"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className={cn(
          "flex-1 overflow-y-auto p-6 pt-2 grid gap-6 content-start",
          liveSelectedTurma ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
        )}>
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
              if (!searchTerm.trim()) return true;
              const q = searchTerm.toLowerCase();
              return (
                t.name.toLowerCase().includes(q) ||
                (t.professor_name || '').toLowerCase().includes(q) ||
                t.product_name.toLowerCase().includes(q)
              );
            }).map(turma => {
              const confirmados = (turma.attendees || []).filter(a => a.status === 'confirmado').length;
              const st = TURMA_STATUS_LABELS[turma.status] || TURMA_STATUS_LABELS.agendada;
              const isSelected = liveSelectedTurma?.id === turma.id;
              const totalVendas = totalVendasTurma(turma);
              const potentialVendas = (turma.product_price || 0) * (turma.attendees || []).length;

              return (
                <div
                  key={turma.id}
                  onClick={() => setSelectedTurma(isSelected ? null : turma)}
                  className={cn(
                    'bg-white rounded-2xl border cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl group relative overflow-hidden flex flex-col',
                    isSelected 
                      ? 'border-emerald-400 ring-2 ring-emerald-500/10 shadow-emerald-100/50 scale-[1.02]' 
                      : 'border-slate-100 hover:border-emerald-200 hover:-translate-y-1'
                  )}
                >
                  {/* Status Indicator Stripe */}
                  <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', STATUS_STRIPE[turma.status] ?? 'bg-slate-300')} />

                  {/* Top Actions (Hidden by default, shown on hover or if selected) */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingTurma(turma); setIsNewTurmaOpen(true); }}
                      className="p-1.5 bg-white/90 backdrop-blur shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); if(confirm('Excluir esta turma?')) removeTurma(turma.id); if (isSelected) setSelectedTurma(null); }}
                      className="p-1.5 bg-white/90 backdrop-blur shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 pl-7 flex flex-col h-full">
                    {/* Badge Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn(
                        'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1',
                        st.color
                      )}>
                        {st.icon}
                        {st.label}
                      </span>
                      {turma.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-wider">
                          {turma.category}
                        </span>
                      )}
                    </div>

                    {/* Title & Professor */}
                    <div className="mb-4">
                      <h3 className="font-extrabold text-slate-800 text-base leading-tight group-hover:text-emerald-700 transition-colors">
                        {turma.name || 'Turma sem nome'}
                      </h3>
                      <div className="mt-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Users size={12} className="text-emerald-500" />
                          <span>{turma.professor_name || 'Sem professor'}</span>
                        </div>
                        {turma.professor_email && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <LogIn size={10} className="ml-0.5" />
                            <span className="truncate">{turma.professor_email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Product & Details Block */}
                    <div className="grid grid-cols-2 gap-3 mb-5 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Produto</p>
                        <div className="flex items-center gap-1.5">
                           <Package size={12} className="text-emerald-500 shrink-0" />
                           <span className="text-xs font-bold text-slate-700 truncate">{turma.product_name}</span>
                        </div>
                        {turma.product_price && (
                          <p className="text-[10px] font-medium text-emerald-600 ml-5">R$ {turma.product_price.toLocaleString('pt-BR')}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Local & Data</p>
                        <div className="flex items-center gap-1.5">
                           <Calendar size={12} className="text-emerald-500 shrink-0" />
                           <span className="text-xs font-bold text-slate-700">
                             {turma.date ? new Date(turma.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--'}
                           </span>
                           <span className="text-xs text-slate-400 font-medium">| {turma.time || '--:--'}</span>
                        </div>
                        {turma.location && (
                          <div className="flex items-center gap-1.5 ml-0.5 text-[10px] text-slate-500 font-medium">
                            <MapPin size={10} className="text-slate-400" />
                            <span className="truncate">{turma.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress & Stats Area */}
                    <div className="mt-auto space-y-3">
                      {/* Attendance Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-500">Confirmados</span>
                          <span className="text-emerald-600 text-xs">{confirmados} / {(turma.attendees || []).length}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: (turma.attendees || []).length ? `${(confirmados / turma.attendees.length) * 100}%` : '0%' }}
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                          />
                        </div>
                      </div>

                      {/* Financial Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faturamento</span>
                          <span className="text-sm font-black text-slate-800">
                            R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        {potentialVendas > 0 && (
                           <div className="flex flex-col text-right">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Potencial</span>
                             <span className="text-[11px] font-bold text-slate-500">
                               R$ {potentialVendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                             </span>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Corner Visual Element */}
                  {turma.status === 'concluida' && (
                    <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                      <div className="absolute top-[-10px] right-[-10px] w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
                      <CheckCheck size={40} className="absolute top-2 right-2 text-emerald-500/10 rotate-12" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel — Attendance Detail & Kanban */}
      <AnimatePresence mode="wait">
        {liveSelectedTurma && (
          <motion.div
            key={`detail-panel-${liveSelectedTurma.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed inset-0 lg:relative z-50 lg:z-0 lg:flex-1 flex flex-col border-l border-slate-200 bg-white overflow-hidden"
          >
            {/* Panel Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white relative z-10">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-lg font-bold text-slate-800 leading-tight truncate">{liveSelectedTurma.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{liveSelectedTurma.professor_name || 'Sem professor'}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] sm:text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar size={11} className="text-emerald-500" />{liveSelectedTurma.date ? new Date(liveSelectedTurma.date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</span>
                  <span className="flex items-center gap-1"><Clock size={11} className="text-emerald-500" />{liveSelectedTurma.time || '--:--'}</span>
                  <div className="hidden sm:flex items-center gap-1"><MapPin size={11} className="text-emerald-500" />{liveSelectedTurma.location || '--'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {liveSelectedTurma.status !== 'concluida' && (
                  <button
                    onClick={handleMarkConcluida}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all"
                    title="Marcar turma como concluída"
                  >
                    <CheckCheck size={14} />
                    <span className="hidden sm:inline">Concluída</span>
                  </button>
                )}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={cn('p-1.5 rounded-md transition-all', viewMode === 'kanban' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600')}
                    title="Visualização Kanban"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode('lista')}
                    className={cn('p-1.5 rounded-md transition-all', viewMode === 'lista' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600')}
                    title="Visualização Lista"
                  >
                    <LayoutList size={15} />
                  </button>
                </div>
                <button
                  onClick={() => setSelectedTurma(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors shadow-sm bg-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="px-4 sm:px-6 py-3 bg-slate-50/50 border-b border-slate-100 grid grid-cols-4 gap-2 sm:gap-3">
              {STATUS_COLUMNS.map(col => {
                const count = (liveSelectedTurma.attendees || []).filter(a => a.status === col.id).length;
                const total = (liveSelectedTurma.attendees || []).filter(a => a.status === col.id).reduce((s, a) => s + (a.vendas || 0), 0);
                return (
                  <div key={col.id} className={cn('rounded-xl p-2.5 border transition-colors', col.bg)}>
                    <div className="flex items-center gap-1 mb-1">
                      {col.icon}
                      <span className={cn('text-[10px] font-bold hidden sm:block', col.color)}>{col.label}</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{count}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                  </div>
                );
              })}
            </div>

            {/* Attendance content — Kanban or Lista */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {viewMode === 'kanban' ? (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
                    Lista de Presença — Kanban
                  </p>
                  <DndContext
                    key={`dnd-${liveSelectedTurma.id}`}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                  >
                    <div className="flex lg:flex-row flex-col gap-4 h-full min-h-[300px]">
                      {STATUS_COLUMNS.map(col => (
                        <TurmaColumn
                          key={`col-${col.id}-${liveSelectedTurma.id}`}
                          column={col}
                          attendees={liveSelectedTurma.attendees || []}
                          onAttendeeClick={(att) => handleAttendeeClick(att, liveSelectedTurma.id)}
                          onRemoveAttendee={(attId) => removeAttendee(liveSelectedTurma.id, attId)}
                          onCheckIn={(att) => handleCheckIn(att, liveSelectedTurma.id)}
                          onNoShow={(att) => handleNoShow(att, liveSelectedTurma.id)}
                        />
                      ))}
                    </div>
                  </DndContext>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
                    Lista de Presença
                  </p>
                  <div className="space-y-2">
                    {(liveSelectedTurma.attendees || []).map(att => {
                      const isPago = (att.valor_recebido ?? 0) > 0;
                      const colDef = STATUS_COLUMNS.find(c => c.id === att.status);
                      return (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-sm hover:border-emerald-200 transition-colors"
                        >
                          <div className="relative shrink-0">
                            <img src={att.photo} alt={att.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-100" referrerPolicy="no-referrer" />
                            {isPago && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                <BadgeCheck size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{att.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{att.responsible || 'Sem responsável'}</p>
                          </div>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline', colDef?.bg, colDef?.color)}>
                            {colDef?.label}
                          </span>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold text-emerald-700">R$ {(att.vendas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                            {isPago && <p className="text-[10px] text-emerald-500">Rec. R$ {att.valor_recebido!.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {att.lead_id && att.status !== 'confirmado' && (
                              <button
                                onClick={() => handleCheckIn(att, liveSelectedTurma.id)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Check-in"
                              >
                                <LogIn size={11} /> CheckIn
                              </button>
                            )}
                            {att.lead_id && att.status !== 'cancelado' && (
                              <button
                                onClick={() => handleNoShow(att, liveSelectedTurma.id)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title="No-show"
                              >
                                <UserX size={11} /> NoShow
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
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
      {selectedAttendeeLead && (
        <LeadDetailsModal
          isOpen={!!selectedAttendeeLead}
          onClose={() => { setSelectedAttendeeLead(null); setSelectedAttendeeInfo(null); }}
          lead={selectedAttendeeLead}
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

/* ── Turma Column Component ────────────────────────────────────────────────── */
interface TurmaColumnProps {
  column: typeof STATUS_COLUMNS[number];
  attendees: TurmaAttendee[];
  onAttendeeClick: (att: TurmaAttendee) => void;
  onRemoveAttendee: (attId: string) => void;
  onCheckIn: (att: TurmaAttendee) => void;
  onNoShow: (att: TurmaAttendee) => void;
}

function TurmaColumn({ column, attendees, onAttendeeClick, onRemoveAttendee, onCheckIn, onNoShow }: TurmaColumnProps) {
  const attendeesInCol = attendees.filter(a => a.status === column.id);
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col flex-1 min-w-[180px]">
      <div className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl border mb-3 shadow-sm', column.bg)}>
        {column.icon}
        <span className={cn('text-xs font-bold', column.color)}>{column.label}</span>
        <span className="ml-auto text-xs font-bold text-slate-400">{attendeesInCol.length}</span>
      </div>

      <div className="flex-1 space-y-2.5 p-2 rounded-xl min-h-[150px]">
        <div ref={setNodeRef} className={cn(
          'min-h-[150px]',
          isOver ? 'bg-emerald-50/50 ring-2 ring-emerald-100 ring-inset' : 'bg-slate-50/30'
        )}>
          {attendeesInCol.map((att) => (
            <AttendeeCard
              key={att.id}
              attendee={att}
              id={att.id}
              onViewDetails={att.lead_id ? () => onAttendeeClick(att) : undefined}
              onRemove={() => onRemoveAttendee(att.id)}
              onCheckIn={att.lead_id ? () => onCheckIn(att) : undefined}
              onNoShow={att.lead_id ? () => onNoShow(att) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Attendee Card ─────────────────────────────────────────────────────────── */
interface AttendeeCardProps {
  attendee: TurmaAttendee;
  id: string;
  onViewDetails?: () => void;
  onRemove?: () => void;
  onCheckIn?: () => void;
  onNoShow?: () => void;
}

function AttendeeCard({ attendee, id, onViewDetails, onRemove, onCheckIn, onNoShow }: AttendeeCardProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const isPago = (attendee.valor_recebido ?? 0) > 0;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = { transform: CSS.Transform.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white rounded-xl border p-3 shadow-sm flex flex-col gap-2 transition-all group/card mb-2',
        isDragging ? 'shadow-xl border-emerald-300 rotate-1 cursor-grabbing scale-[1.02]' : 'hover:border-emerald-200 cursor-grab',
        isPago ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100',
      )}
    >
      {/* Top row: photo + info + remove */}
      <div className="flex items-start gap-2">
        <div className="relative shrink-0">
          <img
            src={attendee.photo}
            alt={attendee.name}
            onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}
            className={cn('w-9 h-9 rounded-full object-cover border-2 border-slate-100 mt-0.5', onViewDetails && 'cursor-pointer hover:opacity-80')}
            referrerPolicy="no-referrer"
          />
          {isPago && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
              <BadgeCheck size={10} className="text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}>
          <p className="text-xs font-bold text-slate-700 truncate leading-tight">{attendee.name}</p>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">{attendee.responsible || 'Sem responsável'}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {attendee.vendas > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                R$ {attendee.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            )}
            {isPago && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <BadgeCheck size={9} /> Pago
              </span>
            )}
          </div>
        </div>

        {onRemove && (
          <div className="shrink-0 flex flex-col items-end gap-1">
            {confirmingRemove ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setConfirmingRemove(false); onRemove(); }} className="px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Sim</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setConfirmingRemove(false); }} className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">Não</button>
              </div>
            ) : (
              <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setConfirmingRemove(true); }} className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover/card:opacity-100" title="Remover da turma">
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* CheckIn / NoShow buttons */}
      {(onCheckIn || onNoShow) && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
          {onCheckIn && attendee.status !== 'confirmado' && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <LogIn size={11} /> CheckIn
            </button>
          )}
          {onNoShow && attendee.status !== 'cancelado' && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onNoShow(); }}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <UserX size={11} /> NoShow
            </button>
          )}
        </div>
      )}
    </div>
  );
}
