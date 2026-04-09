import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
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

// ── Enroll-in-turma modal ────────────────────────────────────────────────────
interface EnrollModalProps {
  lead: Lead;
  onConfirm: (turmaId: string) => void;
  onSkip: () => void;
}

function EnrollInTurmaModal({ lead, onConfirm, onSkip }: EnrollModalProps) {
  const { turmas, fetchTurmas } = useTurmaStore();

  useEffect(() => { fetchTurmas(); }, [fetchTurmas]);

  const matchingTurmas = turmas.filter(
    (t) => t.product.toLowerCase() === lead.product.toLowerCase() && t.status !== 'concluida' && t.status !== 'cancelada'
  );
  const otherTurmas = turmas.filter(
    (t) => !matchingTurmas.some((m) => m.id === t.id) && t.status !== 'concluida' && t.status !== 'cancelada'
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <GraduationCap size={20} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Matricular em Turma</h3>
            <p className="text-xs text-slate-500">{lead.name} foi fechado — selecione a turma</p>
          </div>
        </div>

        {matchingTurmas.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
              Turmas com o produto "{lead.product}"
            </p>
            <div className="space-y-2">
              {matchingTurmas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onConfirm(t.id)}
                  className="w-full text-left px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'} · {t.location || 'Sem local'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {otherTurmas.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Outras turmas</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {otherTurmas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onConfirm(t.id)}
                  className="w-full text-left px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <p className="font-bold text-slate-700 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.product} · {t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {matchingTurmas.length === 0 && otherTurmas.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">Nenhuma turma ativa disponível.</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onSkip} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            Pular
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Inactivity alert banner ──────────────────────────────────────────────────
interface AlertBannerProps {
  alerts: InactivityAlert[];
  onDismiss: (leadId: string) => void;
}

function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map(({ lead, hoursElapsed, type }) => (
        <motion.div
          key={`alert-${lead.id}-${type}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-sm",
            hoursElapsed >= 18
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          )}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">
            <strong>{lead.name}</strong> está sem contato há <strong>{hoursElapsed}h</strong>.
            Responsável: {lead.responsible || 'Não definido'} · {lead.phone}
          </span>
          <button onClick={() => onDismiss(lead.id)} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ── Transfer confirmation banner ─────────────────────────────────────────────
interface TransferBannerProps {
  leads: Lead[];
  allLeads: Lead[];
  onTransfer: (leadId: string, newResponsible: string) => void;
  onDismiss: (leadId: string) => void;
}

function TransferBanner({ leads, allLeads, onTransfer, onDismiss }: TransferBannerProps) {
  if (leads.length === 0) return null;
  const responsibles = Array.from(new Set(allLeads.map((l) => l.responsible).filter(Boolean))) as string[];

  return (
    <div className="space-y-2">
      {leads.map((lead) => {
        const others = responsibles.filter((r) => r !== lead.responsible);
        return (
          <motion.div
            key={`transfer-${lead.id}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm font-medium shadow-sm"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">
              <strong>{lead.name}</strong> está sem contato há mais de 48h. Transferir para:
            </span>
            <select
              onChange={(e) => { if (e.target.value) onTransfer(lead.id, e.target.value); }}
              className="text-xs border border-red-200 rounded-lg px-2 py-1 bg-white text-red-700 cursor-pointer"
              defaultValue=""
            >
              <option value="">Selecionar...</option>
              {others.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="__dismiss__">Dispensar aviso</option>
            </select>
            <button onClick={() => onDismiss(lead.id)} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

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
    return matchesSearch && matchesResponsible && matchesProduct;
  });

  const visibleColumns = selectedStatus === 'all'
    ? COLUMNS
    : COLUMNS.filter(col => col.id === selectedStatus);

  return (
    <div className="p-6 space-y-4 bg-gray-50 min-h-screen">
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

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Pipeline de Vendas
            <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              {leads.length} leads
            </span>
            {activeAlerts.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                <Bell size={11} /> {activeAlerts.length} alerta{activeAlerts.length > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm">Gerencie seu fluxo de vendas e acompanhe o progresso dos leads.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          {isLoading && <Loader2 className="w-5 h-5 text-emerald-600 animate-spin hidden sm:block" />}

          {/* Global Summary Card */}
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl mr-2 shadow-sm">
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

          {/* Manual Refresh */}
          <button
            onClick={() => currentPipelineId && fetchLeads(currentPipelineId)}
            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm"
            title="Sincronizar com o Banco"
          >
            <Loader2 className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>

          {/* Multi-Pipeline Selector */}
          <PipelineSelect
            pipelines={pipelines}
            currentPipelineId={currentPipelineId}
            onPipelineChange={(id) => {
              setCurrentPipeline(id);
              fetchLeads(id);
            }}
            className="w-full sm:w-auto min-w-[200px]"
          />

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as string | 'all')}
              className={cn(
                "pl-10 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer text-sm font-medium text-gray-700 min-w-[160px]",
                selectedStatus !== 'all' ? "pr-10" : "pr-8"
              )}
            >
              <option value="all">Filtro: Estágio</option>
              {COLUMNS.map(col => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {/* Product Filter */}
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer text-sm font-medium text-gray-700 min-w-[160px]"
            >
              <option value="all">Filtro: Produto</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {/* Responsible Filter */}
          <div className="relative" ref={responsibleDropdownRef}>
            <div className="relative flex items-center">
              <button
                onClick={() => setIsResponsibleDropdownOpen(!isResponsibleDropdownOpen)}
                className={cn(
                  "flex items-center gap-2 pl-10 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-gray-700 min-w-[200px] text-left",
                  selectedResponsible !== 'all' ? "pr-10" : "pr-4"
                )}
              >
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <span className="truncate">
                  {selectedResponsible === 'all' ? 'Todos Responsáveis' : selectedResponsible}
                </span>
                <ChevronDown className={cn("ml-auto text-gray-400 transition-transform", isResponsibleDropdownOpen && "rotate-180")} size={16} />
              </button>
              {selectedResponsible !== 'all' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedResponsible('all'); }}
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  title="Limpar filtro"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <AnimatePresence>
              {isResponsibleDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Filtrar nomes..."
                        value={responsibleSearch}
                        onChange={(e) => setResponsibleSearch(e.target.value)}
                        className="w-full pl-8 pr-4 py-1.5 bg-gray-50 border-none rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    <button
                      onClick={() => { setSelectedResponsible('all'); setIsResponsibleDropdownOpen(false); setResponsibleSearch(''); }}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors",
                        selectedResponsible === 'all' ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-gray-700"
                      )}
                    >
                      Todos Responsáveis
                    </button>
                    {filteredResponsibles.map(name => (
                      <button
                        key={name}
                        onClick={() => { setSelectedResponsible(name); setIsResponsibleDropdownOpen(false); setResponsibleSearch(''); }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors",
                          selectedResponsible === name ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-gray-700"
                        )}
                      >
                        {name}
                      </button>
                    ))}
                    {filteredResponsibles.length === 0 && responsibleSearch && (
                      <div className="px-4 py-3 text-center text-xs text-gray-500">
                        Nenhum responsável encontrado
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all w-full sm:w-64"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              <Download size={20} />
            </button>
            <button
              onClick={() => { setInitialStageIdForNewLead(undefined); setIsNewLeadModalOpen(true); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold"
            >
              <Plus size={20} />
              <span className="whitespace-nowrap">Novo Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
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
                        .map((lead, index) => {
                          const elapsedHours = getElapsedHours(lead);
                          const isWarning = elapsedHours >= 12 && elapsedHours < 18 && lead.status !== 'closed';
                          const isDanger = elapsedHours >= 18 && lead.status !== 'closed';
                          const DraggableAny = Draggable as any;
                          return (
                            <DraggableAny key={lead.id} draggableId={lead.id} index={index}>
                              {(provided: any, snapshot: any) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onDoubleClick={() => setSelectedLead(lead)}
                                  className={cn(
                                    "bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative",
                                    snapshot.isDragging ? "shadow-xl border-emerald-500 rotate-2" : "",
                                    isDanger ? "border-red-200 hover:border-red-300" : isWarning ? "border-amber-200 hover:border-amber-300" : "hover:border-emerald-200"
                                  )}
                                >
                                  {/* Inactivity badge */}
                                  {(isWarning || isDanger) && (
                                    <div className={cn(
                                      "absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                      isDanger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                                    )}>
                                      <AlertTriangle size={9} />
                                      {elapsedHours}h
                                    </div>
                                  )}

                                  {/* Card Header */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <img
                                          src={lead.photo || 'https://via.placeholder.com/150'}
                                          alt={lead.name}
                                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-50 shadow-sm"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{lead.name}</h4>
                                        <div className="flex gap-0.5">
                                          {[...Array(5)].map((_, i) => (
                                            <Star
                                              key={i}
                                              size={10}
                                              className={cn(
                                                i < (lead.stars || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
                                              )}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <button className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
                                      <MoreHorizontal size={18} />
                                    </button>
                                  </div>

                                  {/* Card Body */}
                                  <div className="space-y-2.5">
                                    <div className="flex items-center gap-2 text-slate-500">
                                      <Phone size={14} className="text-emerald-500" />
                                      <span className="text-xs font-medium">{lead.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500">
                                      <Plus size={14} className="text-slate-300" />
                                      <span className="text-xs font-medium">{lead.product}</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                      <span className="text-sm font-bold text-slate-800">
                                        R$ {getLeadEffectiveValue(lead).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                      </span>

                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}
                                          className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-slate-100"
                                          title="Excluir lead"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                                          className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-100"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-100">
                                          <CheckSquare size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {lead.status === 'qualified' && (
                                    <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-2">
                                      {[
                                        { id: 'qualified', label: 'Qualificado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                                        { id: 'warming', label: 'Aquecimento', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                                        { id: 'disqualified', label: 'Desqualificado', color: 'bg-red-50 text-red-600 border-red-100' }
                                      ].map((sub) => (
                                        <button
                                          key={sub.id}
                                          onClick={(e) => { e.stopPropagation(); updateLeadSubStatus(lead.id, sub.id as LeadSubStatus); }}
                                          className={cn(
                                            "text-[10px] font-bold px-2 py-1 rounded-full border transition-all",
                                            lead.subStatus === sub.id
                                              ? sub.color
                                              : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                          )}
                                        >
                                          {sub.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </DraggableAny>
                          );
                        })}
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
