import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'motion/react';
import {
  MoreHorizontal,
  Plus,
  Star,
  Trash2,
  Search,
  Filter,
  Download,
  ChevronDown,
  User,
  Loader2,
  X,
  Phone,
  Edit2,
  CheckSquare,
  Bell,
  AlertTriangle,
  GraduationCap,
  Trophy,
} from 'lucide-react';
import { useLeadStore } from '../store/useLeadStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { PipelineSelect } from '../components/pipeline/PipelineSelect';
import { useTurmaStore } from '../store/useTurmaStore';
import { useProductStore } from '../store/useProductStore';
import { useAuthStore } from '../store/useAuthStore';
import { Lead, LeadSubStatus } from '../types/leads';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { NewLeadModal } from '../components/leads/NewLeadModal';
import { cn, getLeadEffectiveValue } from '../lib/utils';
import {
  checkLeadInactivity,
  fireAlerts,
  requestNotificationPermission,
  getElapsedHours,
  InactivityAlert,
} from '../services/alertService';

import { EnrollInTurmaModal } from '../components/pipeline/EnrollInTurmaModal';
import { AlertBanner } from '../components/pipeline/AlertBanner';
import { TransferBanner } from '../components/pipeline/TransferBanner';
import { LeadCard } from '../components/pipeline/LeadCard';


// ── Main component ────────────────────────────────────────────────────────────
export const Pipeline: React.FC = () => {
  const {
    leads,
    updateLeadStage,
    updateLeadSubStatus,
    updateLead,
    selectedLead,
    setSelectedLead,
    fetchLeads,
    isLoading,
    deleteLead,
  } = useLeadStore();

  const {
    pipelines,
    fetchPipelines,
    currentPipelineId,
    setCurrentPipeline
  } = usePipelineStore();

  const { addAttendee, fetchTurmas } = useTurmaStore();
  const { products, fetchProducts } = useProductStore();
  const { user } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [isResponsibleDropdownOpen, setIsResponsibleDropdownOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [initialStageIdForNewLead, setInitialStageIdForNewLead] = useState<string | undefined>(undefined);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedStars, setSelectedStars] = useState<number | 'all'>('all');
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const responsibleDropdownRef = useRef<HTMLDivElement>(null);

  // Inactivity alert state
  const [activeAlerts, setActiveAlerts] = useState<InactivityAlert[]>([]);
  const [toTransfer, setToTransfer] = useState<Lead[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [dismissedTransfers, setDismissedTransfers] = useState<Set<string>>(new Set());

  // Enroll-in-turma modal state
  const [enrollLead, setEnrollLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchPipelines();
    fetchTurmas();
    fetchProducts();
    requestNotificationPermission();
  }, [fetchPipelines, fetchTurmas, fetchProducts]);

  useEffect(() => {
    if (currentPipelineId) {
      fetchLeads(currentPipelineId);
    }
  }, [currentPipelineId, fetchLeads]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (responsibleDropdownRef.current && !responsibleDropdownRef.current.contains(event.target as Node)) {
        setIsResponsibleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inactivity check — runs every 60 seconds
  const runInactivityCheck = useCallback(() => {
    if (leads.length === 0) return;
    const { alerts, toTransfer: transfer } = checkLeadInactivity(leads);

    const visibleAlerts = alerts.filter((a) => !dismissedAlerts.has(a.lead.id + a.type));
    const visibleTransfers = transfer.filter((l) => !dismissedTransfers.has(l.id));

    if (visibleAlerts.length > 0) {
      setActiveAlerts(visibleAlerts);
      const userEmail = user?.email || '';
      fireAlerts(visibleAlerts, userEmail);
    }
    if (visibleTransfers.length > 0) {
      setToTransfer(visibleTransfers);
    }
  }, [leads, dismissedAlerts, dismissedTransfers, user]);

  useEffect(() => {
    runInactivityCheck();
    const interval = setInterval(runInactivityCheck, 60_000);
    return () => clearInterval(interval);
  }, [runInactivityCheck]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStageId = destination.droppableId;
    await updateLeadStage(draggableId, newStageId);

    // Update last_contact_at when lead is moved
    await updateLead(draggableId, { last_contact_at: new Date().toISOString() });

    // When moved to a stage that looks like 'closed'/'ganho', offer to enroll in turma
    const targetStage = currentPipeline?.stages.find(s => s.id === newStageId);
    if (targetStage?.name.toLowerCase().includes('ganho') || targetStage?.name.toLowerCase().includes('fechado')) {
      const movedLead = leads.find((l) => l.id === draggableId);
      if (movedLead) {
        setEnrollLead(movedLead);
      }
    }
  };

  const handleEnrollConfirm = async (turmaId: string) => {
    if (!enrollLead) return;
    await addAttendee(turmaId, {
      lead_id: enrollLead.id,
      name: enrollLead.name,
      photo: enrollLead.photo,
      responsible: enrollLead.responsible || '',
      status: 'matriculado',
      vendas: getLeadEffectiveValue(enrollLead),
    });
    setEnrollLead(null);
  };

  const handleTransfer = async (leadId: string, newResponsible: string) => {
    if (newResponsible === '__dismiss__') {
      setDismissedTransfers((prev) => new Set([...prev, leadId]));
      setToTransfer((prev) => prev.filter((l) => l.id !== leadId));
      return;
    }
    await updateLead(leadId, {
      responsible: newResponsible,
      last_contact_at: new Date().toISOString(),
    });
    setToTransfer((prev) => prev.filter((l) => l.id !== leadId));
    setDismissedTransfers((prev) => new Set([...prev, leadId]));
    fetchLeads(currentPipelineId);
  };

  const dismissAlert = (leadId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.lead.id !== leadId));
    setDismissedAlerts((prev) => new Set([...prev, leadId]));
  };

  const dismissTransfer = (leadId: string) => {
    setToTransfer((prev) => prev.filter((l) => l.id !== leadId));
    setDismissedTransfers((prev) => new Set([...prev, leadId]));
  };

  const currentPipeline = pipelines.find(p => p.id === currentPipelineId);
  const COLUMNS = currentPipeline?.stages.map(s => ({
    id: s.id,
    title: s.name,
    color: s.color || 'bg-blue-500'
  })) || [];

  const responsibles = Array.from(new Set(leads.map(l => l.responsible).filter(Boolean))) as string[];
  const filteredResponsibles = responsibles.filter(name =>
    name.toLowerCase().includes(responsibleSearch.toLowerCase())
  );

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.responsible && lead.responsible.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesResponsible = selectedResponsible === 'all' || lead.responsible === selectedResponsible;
    const matchesProduct = selectedProduct === 'all' || lead.product === selectedProduct;
    const matchesStars = selectedStars === 'all' || (lead.stars || 0) === selectedStars;
    return matchesSearch && matchesResponsible && matchesProduct && matchesStars;
  });

  const activeFilterCount = [
    selectedResponsible !== 'all',
    selectedProduct !== 'all',
    selectedStatus !== 'all',
    selectedStars !== 'all',
    searchTerm !== '',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedResponsible('all');
    setSelectedProduct('all');
    setSelectedStatus('all');
    setSelectedStars('all');
  };

  const visibleColumns = selectedStatus === 'all'
    ? COLUMNS
    : COLUMNS.filter(col => col.id === selectedStatus);

  return (
    <div className="p-6 space-y-4 bg-gray-50 min-h-screen w-full">
      {/* Inactivity Alert Banners */}
      <AnimatePresence>
        {(activeAlerts.length > 0 || toTransfer.length > 0) && (
          <motion.div
            key="alert-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <AlertBanner alerts={activeAlerts} onDismiss={dismissAlert} />
            <TransferBanner
              leads={toTransfer}
              allLeads={leads}
              onTransfer={handleTransfer}
              onDismiss={dismissTransfer}
            />

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-col gap-3">
        {/* Row 1: title + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
              Pipeline de Vendas
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {filteredLeads.length}/{leads.length} leads
              </span>
              {activeAlerts.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  <Bell size={11} /> {activeAlerts.length} alerta{activeAlerts.length > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Gerencie seu fluxo de vendas e acompanhe o progresso dos leads.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Valor total */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Trophy size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Valor Total</p>
                <p className="text-sm font-black text-emerald-700 mt-0.5">
                  R$ {filteredLeads.reduce((sum, l) => sum + getLeadEffectiveValue(l), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Refresh */}
            <button
              onClick={() => currentPipelineId && fetchLeads(currentPipelineId)}
              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm"
              title="Sincronizar"
            >
              <Loader2 className={cn("w-5 h-5", isLoading && "animate-spin")} />
            </button>

            <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors" title="Exportar">
              <Download size={18} />
            </button>

            <button
              onClick={() => { setInitialStageIdForNewLead(undefined); setIsNewLeadModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold whitespace-nowrap"
            >
              <Plus size={18} />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Row 2: Pipeline selector */}
        <div className="flex items-center gap-3">
          <PipelineSelect
            pipelines={pipelines}
            currentPipelineId={currentPipelineId}
            onPipelineChange={(id) => { setCurrentPipeline(id); fetchLeads(id); }}
            className="w-full max-w-xs"
          />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {/* Header da barra de filtros */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter size={16} className={cn(activeFilterCount > 0 ? "text-emerald-600" : "text-gray-400")} />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-[10px] font-black bg-emerald-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Active filter pills */}
            {searchTerm && (
              <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                "{searchTerm}"
                <button onClick={() => setSearchTerm('')}><X size={11} /></button>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
                {COLUMNS.find(c => c.id === selectedStatus)?.title}
                <button onClick={() => setSelectedStatus('all')}><X size={11} /></button>
              </span>
            )}
            {selectedProduct !== 'all' && (
              <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                {selectedProduct}
                <button onClick={() => setSelectedProduct('all')}><X size={11} /></button>
              </span>
            )}
            {selectedResponsible !== 'all' && (
              <span className="flex items-center gap-1 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full">
                {selectedResponsible}
                <button onClick={() => setSelectedResponsible('all')}><X size={11} /></button>
              </span>
            )}
            {selectedStars !== 'all' && (
              <span className="flex items-center gap-1 text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded-full">
                {selectedStars}★
                <button onClick={() => setSelectedStars('all')}><X size={11} /></button>
              </span>
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
              >
                Limpar todos
              </button>
            )}
          </div>
        </div>

        {/* Filter inputs — sempre visíveis */}
        <div className="flex flex-wrap gap-3 p-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar por nome, produto ou responsável..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Stage filter */}
                <div className="relative min-w-[160px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className={cn(
                      "w-full pl-9 pr-8 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer text-sm font-medium transition-all",
                      selectedStatus !== 'all' ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-700"
                    )}
                  >
                    <option value="all">Todos os estágios</option>
                    {COLUMNS.map(col => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                </div>

                {/* Product filter */}
                <div className="relative min-w-[160px]">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className={cn(
                      "w-full pl-9 pr-8 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer text-sm font-medium transition-all",
                      selectedProduct !== 'all' ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-700"
                    )}
                  >
                    <option value="all">Todos os produtos</option>
                    {products.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                </div>

                {/* Responsible filter */}
                <div className="relative min-w-[180px]" ref={responsibleDropdownRef}>
                  <button
                    onClick={() => setIsResponsibleDropdownOpen(!isResponsibleDropdownOpen)}
                    className={cn(
                      "w-full flex items-center gap-2 pl-9 pr-8 py-2 bg-gray-50 border rounded-xl text-sm font-medium text-left transition-all",
                      selectedResponsible !== 'all'
                        ? "border-teal-300 bg-teal-50 text-teal-700"
                        : "border-gray-200 text-gray-700"
                    )}
                  >
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <span className="truncate flex-1">
                      {selectedResponsible === 'all' ? 'Todos responsáveis' : selectedResponsible}
                    </span>
                    <ChevronDown className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-transform", isResponsibleDropdownOpen && "rotate-180")} size={14} />
                  </button>
                  <AnimatePresence>
                    {isResponsibleDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                              type="text"
                              placeholder="Filtrar..."
                              value={responsibleSearch}
                              onChange={(e) => setResponsibleSearch(e.target.value)}
                              className="w-full pl-7 pr-3 py-1.5 bg-gray-50 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto py-1">
                          <button
                            onClick={() => { setSelectedResponsible('all'); setIsResponsibleDropdownOpen(false); setResponsibleSearch(''); }}
                            className={cn("w-full px-3 py-2 text-left text-sm transition-colors", selectedResponsible === 'all' ? "text-emerald-600 font-bold bg-emerald-50/60" : "text-gray-700 hover:bg-gray-50")}
                          >
                            Todos
                          </button>
                          {filteredResponsibles.map(name => (
                            <button
                              key={name}
                              onClick={() => { setSelectedResponsible(name); setIsResponsibleDropdownOpen(false); setResponsibleSearch(''); }}
                              className={cn("w-full px-3 py-2 text-left text-sm transition-colors", selectedResponsible === name ? "text-emerald-600 font-bold bg-emerald-50/60" : "text-gray-700 hover:bg-gray-50")}
                            >
                              {name}
                            </button>
                          ))}
                          {filteredResponsibles.length === 0 && responsibleSearch && (
                            <div className="px-3 py-3 text-center text-xs text-gray-400">Nenhum encontrado</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Stars filter */}
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Star size={14} className="text-gray-400 mr-1" />
                  {(['all', 1, 2, 3, 4, 5] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStars(s)}
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-xs font-bold transition-all",
                        selectedStars === s
                          ? "bg-yellow-400 text-white shadow-sm"
                          : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                      )}
                    >
                      {s === 'all' ? 'Todas' : `${s}★`}
                    </button>
                  ))}
                </div>
              </div>
      </div>

      {/* Kanban Board Container */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            className="flex gap-6 overflow-x-auto p-6 pb-5"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#6ee7b7 #f0fdf4' }}
          >
            {visibleColumns.map((column) => (
              <div key={column.id} className="flex flex-col min-w-[320px] bg-gray-50/50 rounded-2xl p-4 border border-gray-200/60 h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn("w-2 h-2 rounded-full", column.color.startsWith('bg-') ? column.color : '')}
                        style={{ backgroundColor: column.color.startsWith('bg-') ? undefined : column.color }}
                      />
                      <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        {column.title}
                        <ChevronDown size={14} className="text-gray-400" />
                      </h3>
                    </div>
                    <p className="text-[10px] font-black text-emerald-600 ml-4">
                      R$ {filteredLeads
                        .filter(l => (l.stage_id || COLUMNS[0]?.id) === column.id)
                        .reduce((sum, l) => sum + getLeadEffectiveValue(l), 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {filteredLeads.filter(l => (l.stage_id || COLUMNS[0]?.id) === column.id).length}
                    </span>
                    <button
                      onClick={() => { setInitialStageIdForNewLead(column.id); setIsNewLeadModalOpen(true); }}
                      className="p-1.5 bg-white border border-gray-200 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
                      title={`Adicionar lead em ${column.title}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex-1 space-y-3 min-h-[500px] transition-colors rounded-xl p-1",
                        snapshot.isDraggingOver ? "bg-emerald-50/50" : ""
                      )}
                    >
                      {filteredLeads
                        .filter((lead) => (lead.stage_id || COLUMNS[0]?.id) === column.id)
                        .map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <LeadCard
                                lead={lead}
                                index={index}
                                provided={dragProvided}
                                snapshot={dragSnapshot}
                                onDoubleClick={() => setSelectedLead(lead)}
                                columnId={column.id}
                              />
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <LeadDetailsModal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          pipelineStages={COLUMNS}
          currentStageId={selectedLead.stage_id || COLUMNS[0]?.id}
          onStageChange={(stageId) => updateLeadStage(selectedLead.id, stageId)}
        />
      )}

      {/* New Lead Modal */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        pipelineId={currentPipelineId}
        initialStageId={initialStageIdForNewLead}
      />

      {/* Enroll in Turma Modal */}
      <AnimatePresence>
        {enrollLead && (
          <EnrollInTurmaModal
            lead={enrollLead}
            onConfirm={handleEnrollConfirm}
            onSkip={() => setEnrollLead(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
