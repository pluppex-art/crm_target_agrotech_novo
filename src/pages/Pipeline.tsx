import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Trophy, Bell, ShieldAlert } from 'lucide-react';
import type { DragEndEvent } from '@dnd-kit/core';
import { usePermissions } from '../hooks/usePermissions';
import { PipelineHeader } from '../components/pipeline/PipelineHeader';
import { PipelineFilters } from '../components/pipeline/PipelineFilters';
import { PipelineBoard } from '../components/pipeline/PipelineBoard';
import { PipelineParticles } from '../components/pipeline/PipelineParticles';
import { usePipelineFilters } from '../hooks/usePipelineFilters';
import { usePipelineAlerts } from '../hooks/usePipelineAlerts';
import { PipelineSelect } from '../components/pipeline/PipelineSelect';
import { useLeadStore } from '../store/useLeadStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { useTurmaStore } from '../store/useTurmaStore';
import { useProductStore } from '../store/useProductStore';
import { useProfileStore } from '../store/useProfileStore';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Lead, LeadStatus } from '../types/leads';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { NewLeadModal } from '../components/leads/NewLeadModal';
import { cn, getLeadEffectiveValue } from '../lib/utils';
import { requestNotificationPermission } from '../services/alertService';
import { PeriodFilterModal } from '../components/common/PeriodFilterModal';
import { EnrollInTurmaModal } from '../components/pipeline/EnrollInTurmaModal';
import { LeadCard } from '../components/pipeline/LeadCard';
import { checklistService } from '../services/checklistService';
import { financialCalculator } from '../services/financialCalculator';
import { calcPipelinePayments } from '../calculations/pipelineMetrics';
import { notifyStageChange } from '../services/leadNotificationService';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSquadStore } from '../store/useSquadStore';





// ── Main component ────────────────────────────────────────────────────────────
export const Pipeline: React.FC = () => {
  const { hasPermission } = usePermissions();
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
    subscribeToLeads,
  } = useLeadStore();

  const {
    pipelines,
    fetchPipelines,
    currentPipelineId,
    setCurrentPipeline,
    subscribe: subscribePipelines,
  } = usePipelineStore();

  const { turmas, addAttendee, fetchTurmas, subscribe: subscribeTurmas } = useTurmaStore();
  const { products, fetchProducts, subscribe: subscribeProducts } = useProductStore();
  const { tasks, fetchTasks, subscribe: subscribeTasks } = useTaskStore();
  const authUser = useAuthStore(state => state.user);
  const { profiles, fetchProfiles } = useProfileStore();
  const { fetchSettings, subscribe: subscribeSettings } = useSettingsStore();
  const permissions = usePermissions();

  const isComercial = useMemo(() => {
    if (!authUser?.id || profiles.length === 0) return false;
    const myProfile = profiles.find((p: any) => p.id === authUser.id);
    if (!myProfile) return false;

    const permissions = myProfile.cargos?.permissions || [];
    const isAdmin = permissions.includes('admin.all');
    if (isAdmin) return false;

    const dept = (myProfile.department || '').toLowerCase().trim();
    const cargo = (myProfile.cargos?.name || '').toLowerCase().trim();

    const isVendedorRole = cargo.includes('vendedor');
    const isComercialDept = dept === 'comercial';
    
    // Se for do departamento Comercial ou tiver cargo de Vendedor, visão restrita (só vê os próprios leads)
    return isVendedorRole || isComercialDept;
  }, [authUser?.id, profiles]);


  const leadToTurmaDate = useMemo(() => {
    const mapping: Record<string, string> = {};
    turmas.forEach(t => {
      t.attendees.forEach(a => {
        if (a.lead_id) mapping[a.lead_id] = t.date;
      });
    });
    return mapping;
  }, [turmas]);

  const filters = usePipelineFilters(leads, authUser?.id, isComercial, leadToTurmaDate);

  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [initialStageIdForNewLead, setInitialStageIdForNewLead] = useState<string | undefined>(undefined);
  const [minimizedColumns, setMinimizedColumns] = useState<Set<string>>(new Set());
  // Track whether user manually toggled a column (don't auto-reset their choice)
  const userToggledRef = useRef<Set<string>>(new Set());

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const currentPipeline = pipelines.find(p => p.id === currentPipelineId);

  const COLUMNS = currentPipeline?.stages.map(s => ({
    id: s.id,
    title: s.name,
    color: s.color || 'bg-blue-500'
  })) || [];

  const toggleColumnMinimized = (colId: string) => {
    userToggledRef.current.add(colId);
    setMinimizedColumns(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  // Auto-minimize Perdido / Aquecimento / Desqualificado on pipeline load
  useEffect(() => {
    if (!currentPipeline?.stages) return;
    const AUTO_MINIMIZE = ['perdido', 'aquecimento', 'desqualificado', 'conclu'];
    const toMinimize = currentPipeline.stages
      .filter(s => {
        const n = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return AUTO_MINIMIZE.some(kw => n.includes(kw));
      })
      .map(s => s.id)
      .filter(id => !userToggledRef.current.has(id));
    if (toMinimize.length > 0) {
      setMinimizedColumns(prev => {
        const next = new Set(prev);
        toMinimize.forEach(id => next.add(id));
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPipeline?.id]);

  // Background alerts continue firing
  usePipelineAlerts(leads, tasks);

  // Enroll-in-turma modal state
  const [enrollLead, setEnrollLead] = useState<Lead | null>(null);

  // Rocket Animation state for "Ganho"
  const [showRocket, setShowRocket] = useState(false);
  const triggerGanhoAnimation = useCallback(() => {
    setShowRocket(true);
    setTimeout(() => setShowRocket(false), 5000); // 5 seconds for full fireworks
  }, []);

  useEffect(() => {
    fetchPipelines();
    fetchTurmas();
    fetchProducts();
    fetchProfiles();
    fetchTasks();
    fetchSettings();
  }, [fetchPipelines, fetchTurmas, fetchProducts, fetchProfiles, fetchTasks, fetchSettings]);



  useEffect(() => {
    if (currentPipelineId) {
      // Fetch sem filtro de data no Supabase para permitir filtragem por Turma no frontend
      fetchLeads(currentPipelineId);
    }
  }, [currentPipelineId, fetchLeads]);

  useEffect(() => {
    const unsubLeads = subscribeToLeads();
    const unsubPipelines = subscribePipelines();
    const unsubTurmas = subscribeTurmas();
    const unsubProducts = subscribeProducts();
    const unsubTasks = subscribeTasks();
    const unsubSettings = subscribeSettings();
    return () => {
      unsubLeads();
      unsubPipelines();
      unsubTurmas();
      unsubProducts();
      unsubTasks();
      unsubSettings();
    };
  }, [subscribeToLeads, subscribePipelines, subscribeTurmas, subscribeProducts, subscribeTasks, subscribeSettings]);




  const checkGanhoRequirements = useCallback((lead: Lead) => {
    const targetStage = COLUMNS.find(c => c.id === lead.stage_id);
    const productObj = financialCalculator.findProduct(lead.product, products);
    const isService = financialCalculator.isServiceProduct(productObj, lead.product);

    if (!isService) {
      const hasFiles = !!lead.payment_proof_url && !!lead.contract_url;
      if (!(lead.pix_completed && lead.contract_signed && hasFiles)) {
        return {
          valid: false,
          message: 'Para mover para Ganho (Curso) é necessário:\n• Marcar Taxa Matrícula e Contrato assinado\n• Anexar Comprovante e Contrato (Vendedor na aba Informações)'
        };
      }
    } else {
      if (!lead.professor_proof_url) {
        return {
          valid: false,
          message: 'Para mover para Ganho (Serviço) é necessário:\n• Anexar Comprovante de Pagamento (Professor na aba Turma)'
        };
      }
    }
    return { valid: true };
  }, [COLUMNS, products]);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggableId = active.id as string;
    const newStageId = over.id as string;
    const sourceStageId = active.data.current?.columnId;

    if (sourceStageId === newStageId) return;

    const draggedLead = leads.find(l => l.id === draggableId);
    if (!draggedLead) return;

    // Checklist validation
    if (draggedLead.stage_id) {
      const checklists = await checklistService.getChecklistsForStage(draggedLead.stage_id);
      const required = checklists.filter(c => c.required);
      const completions = await checklistService.getCompletionsForLead(draggedLead.id);
      const requiredCompleted = required.filter(r => completions.includes(r.id)).length;
      if (required.length > 0 && requiredCompleted < required.length) {
        alert(`Conclua todos os itens obrigatórios do checklist (${requiredCompleted}/${required.length}) para avançar este lead.`);
        return;
      }
    }

    const targetStage = currentPipeline?.stages.find(s => s.id === newStageId);
    const stageLower = targetStage?.name.toLowerCase() ?? '';
    const isGanhoTarget = stageLower.includes('ganho') || stageLower.includes('fechado') || stageLower.includes('aprovado');

    // Validation for Ganho
    if (isGanhoTarget) {
      const validation = checkGanhoRequirements(draggedLead);
      if (!validation.valid) {
        alert(validation.message);
        return;
      }
    }

    // REMOVE FROM TURMA if moving OUT of Ganho
    const sourceStage = currentPipeline?.stages.find(s => s.id === sourceStageId);
    const sourceLower = sourceStage?.name.toLowerCase() ?? '';
    const isGanhoSource = sourceLower.includes('ganho') || sourceLower.includes('fechado') || sourceLower.includes('aprovado');

    if (isGanhoSource && !isGanhoTarget) {
      const enrollment = leadToTurma[draggedLead.id];
      if (enrollment) {
        const productObj = financialCalculator.findProduct(draggedLead.product || '', products);
        // Check enrollment turma directly — the lead's product may differ from the enrolled turma
        const enrollmentProduct = financialCalculator.findProduct(enrollment.id, products) ?? enrollment;
        const isService = financialCalculator.isServiceProduct(enrollmentProduct as any, enrollment.name)
          || financialCalculator.isServiceProduct(productObj, draggedLead.product);

        if (isService) {
          const { removeAttendee } = useTurmaStore.getState();
          await removeAttendee(enrollment.id, enrollment.attendee.id);
        } else {
          const productName = productObj?.name || enrollment.name;
          const confirmRemove = window.confirm(`O lead "${draggedLead.name}" será removido da turma "${enrollment.name}" pois saiu da etapa Ganho.\n\nProduto do lead: ${productName}\n\nConfirmar?`);
          if (confirmRemove) {
            const { removeAttendee } = useTurmaStore.getState();
            await removeAttendee(enrollment.id, enrollment.attendee.id);
          } else {
            return; // Cancel move
          }
        }
      }
    }

    await updateLeadStage(draggableId, newStageId);

    await updateLead(draggableId, {
      last_contact_at: new Date().toISOString(),
      status: (targetStage?.name ?? '') as LeadStatus,
    });

    if (targetStage?.name) {
      notifyStageChange(draggedLead, targetStage.name, profiles);
    }

    if (isGanhoTarget) {
      const productObj = financialCalculator.findProduct(draggedLead.product, products);
      const isService = financialCalculator.isServiceProduct(productObj, draggedLead.product);
      if (!isService) {
        setEnrollLead(draggedLead);
      }
      triggerGanhoAnimation();
    }
  };

  const handleEnrollConfirm = async (turmaId: string) => {
    if (!enrollLead) return;
    try {
      const result = await addAttendee(turmaId, {
        lead_id: enrollLead.id,
        responsavel_usuario_id: enrollLead.responsavel_usuario_id ?? null,
        name: enrollLead.name,
        photo: enrollLead.photo || `https://i.pravatar.cc/150?u=${enrollLead.id}`,
        responsible: enrollLead.responsible || '',
        status: 'matriculado',
        vendas: financialCalculator.getTotalContracted(enrollLead, products),
        seller_origin: enrollLead.seller_origin,
        cost_center: enrollLead.cost_center as any,
      });

      if (result) {
        setEnrollLead(null);
      } else {
        alert('Erro ao matricular: A operação retornou vazio.');
      }
    } catch (error: any) {
      if (error.message === 'ALREADY_ENROLLED') {
        // Silently close if already enrolled
        setEnrollLead(null);
      } else {
        console.error('Enrollment error:', error);
        alert('Ocorreu um erro ao matricular o cliente.');
      }
    }
  };

  const filteredColumns = filters.selectedStatus === 'all'
    ? COLUMNS
    : COLUMNS.filter((col: { id: string }) => col.id === filters.selectedStatus);

  // IDs das etapas "Ganho" no pipeline atual
  const ganhoStageIds = useMemo(() => {
    return new Set(
      (currentPipeline?.stages ?? [])
        .filter(s => {
          const n = s.name.toLowerCase();
          return n.includes('ganho') || n.includes('aprovado') || n.includes('fechado') || n.includes('conclu');
        })
        .map(s => s.id)
    );
  }, [currentPipeline]);

  // Leads na etapa Ganho: segue TODOS os filtros ativos (search, product, responsible, stars)
  const leadsInCurrentPipeline = useMemo(() => {
    if (!currentPipelineId) return filters.filteredLeads;
    return filters.filteredLeads.filter(l => l.pipeline_id === currentPipelineId);
  }, [filters.filteredLeads, currentPipelineId]);

  const ganhoLeads = useMemo(() => {
    return leadsInCurrentPipeline.filter(l =>
      l.stage_id && ganhoStageIds.has(l.stage_id)
    );
  }, [leadsInCurrentPipeline, ganhoStageIds]);

  const leadToTurma = useMemo(() => {
    const mapping: Record<string, any> = {};
    turmas.forEach(t => {
      t.attendees.forEach(a => {
        if (a.lead_id) mapping[a.lead_id] = { ...t, attendee: a };
      });
    });
    return mapping;
  }, [turmas]);

  // ─── PAGO e PENDENTE ─────────────────────────────────────────────────────────
  // Lógica isolada em src/calculations/pipelineMetrics.ts para sincronizar com o Dashboard
  const { pago: caixaTotalValue, pendente: competenciaTotalValue } = useMemo(
    () => calcPipelinePayments(
      filters.filteredLeads,
      ganhoStageIds,
      leadToTurma,
      products,
    ),
    [filters.filteredLeads, ganhoStageIds, leadToTurma, products],
  );

  // Filtra produtos para não mostrar os de Turmas já Concluídas no dropdown
  const activeProductsForFilter = useMemo(() => {
    const concludedProductNames = new Set<string>();
    turmas.forEach(t => {
      if (t.status === 'concluida') {
        concludedProductNames.add(t.name);
      }
    });

    return products.filter(p => !concludedProductNames.has(p.name));
  }, [products, turmas]);

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-gray-50 flex-1 min-h-0 w-full flex flex-col overflow-hidden min-w-0 max-w-full">
      <PipelineHeader
        caixaTotalValue={caixaTotalValue}
        competenciaTotalValue={competenciaTotalValue}
        leadsCount={filters.filteredLeads.length}
        currentPipelineId={currentPipelineId ?? null}
        pipelines={pipelines}
        onPipelineChange={(id) => {
          if (id === currentPipelineId) return;
          setCurrentPipeline(id);
          fetchLeads(id);
        }}
        fetchLeads={fetchLeads}
        isLoading={isLoading}
        hasPermissionCreate={hasPermission('leads.create')}
        onNewLeadClick={() => {
          setInitialStageIdForNewLead(undefined);
          setIsNewLeadModalOpen(true);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />


      <PipelineFilters
        searchTerm={filters.searchTerm}
        selectedStatus={filters.selectedStatus}
        selectedProduct={filters.selectedProduct}
        selectedResponsible={filters.selectedResponsible}
        selectedStars={filters.selectedStars}
        selectedSquad={filters.selectedSquad}
        responsibles={filters.responsibles}
        products={activeProductsForFilter}
        columns={COLUMNS}
        onSearchChange={filters.setSearchTerm}
        onStatusChange={filters.setSelectedStatus}
        onProductChange={filters.setSelectedProduct}
        onResponsibleChange={filters.setSelectedResponsible}
        onStarsChange={filters.setSelectedStars}
        onSquadChange={filters.setSelectedSquad}
        clearAllFilters={filters.clearAllFilters}
        activeFilterCount={filters.activeFilterCount}
        isVendedor={isComercial}
      />

      {viewMode === 'kanban' ? (
        <PipelineBoard
          filteredLeads={leadsInCurrentPipeline}
          columns={filteredColumns}
          selectedStatus={filters.selectedStatus}
          minimizedColumns={minimizedColumns}
          toggleColumnMinimized={toggleColumnMinimized}
          onDragEnd={onDragEnd}
          onLeadDoubleClick={setSelectedLead}
          onAddLeadToColumn={(columnId) => {
            setInitialStageIdForNewLead(columnId);
            setIsNewLeadModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                <tr className="text-slate-500 uppercase text-[10px] font-black tracking-widest">
                  <th className="px-6 py-4 text-left border-b border-slate-100">Cliente</th>
                  <th className="px-6 py-4 text-left border-b border-slate-100">Estágio</th>
                  <th className="px-6 py-4 text-left border-b border-slate-100">Produto</th>
                  <th className="px-6 py-4 text-left border-b border-slate-100">Squad / Responsável</th>
                  <th className="px-6 py-4 text-center border-b border-slate-100">Temp.</th>
                  <th className="px-6 py-4 text-right border-b border-slate-100">Valor Total</th>
                  <th className="px-6 py-4 text-center border-b border-slate-100">Último Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leadsInCurrentPipeline.map((lead) => {
                  const stage = COLUMNS.find(c => c.id === lead.stage_id);
                  const productObj = financialCalculator.findProduct(lead.product || '', products);
                  const fee = productObj?.enrollment_fee ?? 197;
                  const totalValue = financialCalculator.getEffectiveValue(lead) + fee;

                  const responsibleProfile = profiles.find(p => p.id === lead.responsavel_usuario_id || p.name === lead.responsible);
                  const { getSquadInfoForUser } = useSquadStore.getState();
                  const squadInfo = getSquadInfoForUser(lead.responsavel_usuario_id || responsibleProfile?.id || '', lead.responsible || responsibleProfile?.name || '', profiles);

                  return (
                    <tr
                      key={lead.id}
                      className="group hover:bg-emerald-50/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={lead.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=random`}
                            className="w-8 h-8 rounded-full object-cover border border-slate-100 shadow-sm"
                            alt=""
                          />
                          <div>
                            <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{lead.name}</div>
                            <div className="text-[11px] text-slate-400 font-medium">{lead.phone || lead.email || 'Sem contato'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {stage ? (
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                stage.color.startsWith('bg-') ? stage.color : ""
                              )}
                              style={{ backgroundColor: stage.color.startsWith('bg-') ? undefined : stage.color }}
                            />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                              {stage.title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sem estágio</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-600 truncate max-w-[200px]" title={productObj?.name || lead.product || ''}>
                          {productObj?.name || lead.product}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                            <span className="text-xs font-medium text-slate-500">{responsibleProfile?.name || lead.responsible || 'Sem resp.'}</span>
                          </div>
                          {squadInfo && (
                            <span
                              className="text-[8px] font-black px-1.5 py-0.5 rounded-md tracking-tighter uppercase border w-fit"
                              style={{
                                backgroundColor: `${squadInfo.color}10`,
                                color: squadInfo.color,
                                borderColor: `${squadInfo.color}30`
                              }}
                            >
                              SQUAD {squadInfo.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-1 h-3 rounded-full",
                                i < (lead.stars || 0) ? "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]" : "bg-slate-100"
                              )}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-slate-800 tabular-nums">
                          R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-500">
                            {lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                          </span>
                          {lead.last_contact_at && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(lead.last_contact_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filters.filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic bg-slate-50/20">
                      Nenhum lead encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-[11px] font-bold text-slate-400 flex justify-between items-center">
            <span>{leadsInCurrentPipeline.length} LEADS FILTRADOS</span>
            <span className="uppercase tracking-widest">Target Agrotech CRM</span>
          </div>
        </div>
      )}

      {/* Lead Details Modal */}
      {selectedLead && (
        <LeadDetailsModal
          key={`lead-modal-${selectedLead.id}`}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={leads.find(l => l.id === selectedLead.id) || selectedLead}
          pipelineStages={filteredColumns.length > 0 ? filteredColumns : COLUMNS}
          currentStageId={selectedLead.stage_id || (filteredColumns[0]?.id || COLUMNS[0]?.id)}
          responsibles={filters.responsibles}
          onStageChange={async (stageId: string) => {
            const targetStage = currentPipeline?.stages.find(s => s.id === stageId);
            const stageLower = targetStage?.name.toLowerCase() ?? '';
            const isGanhoTarget = stageLower.includes('ganho') || stageLower.includes('fechado') || stageLower.includes('aprovado');

            if (isGanhoTarget) {
              const validation = checkGanhoRequirements(selectedLead);
              if (!validation.valid) {
                alert(validation.message);
                return;
              }
            }

            // REMOVE FROM TURMA if moving OUT of Ganho
            const sourceStage = currentPipeline?.stages.find(s => s.id === selectedLead.stage_id);
            const sourceLower = sourceStage?.name.toLowerCase() ?? '';
            const isGanhoSource = sourceLower.includes('ganho') || sourceLower.includes('fechado') || sourceLower.includes('aprovado');

            if (isGanhoSource && !isGanhoTarget) {
              const enrollment = leadToTurma[selectedLead.id];
              if (enrollment) {
                const productObj = financialCalculator.findProduct(selectedLead.product || '', products);
                const isService = financialCalculator.isServiceProduct(productObj, selectedLead.product);

                if (isService) {
                  const { removeAttendee } = useTurmaStore.getState();
                  await removeAttendee(enrollment.id, enrollment.attendee.id);
                } else {
                  const confirmRemove = window.confirm(`O lead "${selectedLead.name}" será removido da turma "${enrollment.name}" pois saiu da etapa Ganho. Confirmar?`);
                  if (confirmRemove) {
                    const { removeAttendee } = useTurmaStore.getState();
                    await removeAttendee(enrollment.id, enrollment.attendee.id);
                  } else {
                    return; // Cancel move
                  }
                }
              }
            }

            updateLeadStage(selectedLead.id, stageId);
            updateLead(selectedLead.id, { status: (targetStage?.name ?? '') as LeadStatus });

            if (isGanhoTarget) {
              const productObj = financialCalculator.findProduct(selectedLead.product, products);
              const isService = financialCalculator.isServiceProduct(productObj, selectedLead.product);
              if (!isService) {
                setEnrollLead(selectedLead);
              }
              triggerGanhoAnimation();
            }
          }}
        />
      )}

      {/* New Lead Modal */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        pipelineId={currentPipelineId}
        initialStageId={initialStageIdForNewLead}
        onLeadCreated={(lead) => {
          const targetStage = currentPipeline?.stages.find(s => s.id === lead.stage_id);
          const stageName = (targetStage?.name || '').toLowerCase();
          const isGanho = stageName.includes('ganho') || stageName.includes('fechado') || stageName.includes('aprovado');

          if (isGanho) {
            const productObj = financialCalculator.findProduct(lead.product || '', products);
            const categoryName = (productObj?.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const isService = categoryName.startsWith('servico');

            if (!isService) {
              setEnrollLead(lead);
            }
            triggerGanhoAnimation();
          }
        }}
      />

      {/* Enroll in Turma Modal */}
      {enrollLead && (
        <EnrollInTurmaModal
          lead={enrollLead}
          onConfirm={handleEnrollConfirm}
          onSkip={() => setEnrollLead(null)}
        />
      )}

      <PipelineParticles showRocket={showRocket} />

    </div>
  );
};
