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
import type { Lead } from '../types/leads';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { NewLeadModal } from '../components/leads/NewLeadModal';
import { cn, getLeadEffectiveValue } from '../lib/utils';
import { requestNotificationPermission } from '../services/alertService';
import { EnrollInTurmaModal } from '../components/pipeline/EnrollInTurmaModal';
import { LeadCard } from '../components/pipeline/LeadCard';
import { checklistService } from '../services/checklistService';
import { financialCalculator } from '../services/financialCalculator';





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

  const { addAttendee, fetchTurmas, subscribe: subscribeTurmas } = useTurmaStore();
  const { products, fetchProducts, subscribe: subscribeProducts } = useProductStore();
  const { tasks, fetchTasks, subscribe: subscribeTasks } = useTaskStore();
  const authUser = useAuthStore(state => state.user);
  const { profiles, fetchProfiles } = useProfileStore();
  const permissions = usePermissions();

  const isComercial = useMemo(() => {
    if (!authUser?.id || profiles.length === 0) return false;
    const myProfile = profiles.find((p: any) => p.id === authUser.id);
    if (!myProfile) return false;
    const isAdminRole = myProfile.cargos?.permissions?.includes('admin.all');
    if (isAdminRole) return false;
    return myProfile.department?.toLowerCase() === 'comercial';
  }, [authUser?.id, profiles]);

  const filters = usePipelineFilters(leads, authUser?.id, isComercial);

  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [initialStageIdForNewLead, setInitialStageIdForNewLead] = useState<string | undefined>(undefined);
  const [minimizedColumns, setMinimizedColumns] = useState<Set<string>>(new Set());
  // Track whether user manually toggled a column (don't auto-reset their choice)
  const userToggledRef = useRef<Set<string>>(new Set());

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
    const AUTO_MINIMIZE = ['perdido', 'aquecimento', 'desqualificado'];
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
  }, [fetchPipelines, fetchTurmas, fetchProducts, fetchProfiles, fetchTasks]);



  useEffect(() => {
    if (currentPipelineId) {
      fetchLeads(currentPipelineId);
    }
  }, [currentPipelineId, fetchLeads]);

  useEffect(() => {
    const unsubLeads = subscribeToLeads();
    const unsubPipelines = subscribePipelines();
    const unsubTurmas = subscribeTurmas();
    const unsubProducts = subscribeProducts();
    const unsubTasks = subscribeTasks();
    return () => {
      unsubLeads();
      unsubPipelines();
      unsubTurmas();
      unsubProducts();
      unsubTasks();
    };
  }, [subscribeToLeads, subscribePipelines, subscribeTurmas, subscribeProducts, subscribeTasks]);




  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggableId = active.id as string;
    const newStageId = over.id as string;
    const sourceStageId = active.data.current?.columnId;

    if (sourceStageId === newStageId) return;

    // Checklist validation
    const draggedLead = leads.find(l => l.id === draggableId);
    if (draggedLead && draggedLead.stage_id) {
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

    // Bloqueia arrastar para Ganho sem confirmações + arquivos
    if (isGanhoTarget) {
      const movedLead = leads.find((l) => l.id === draggableId);
      if (movedLead) {
        const productObj = financialCalculator.findProduct(movedLead.product, products);
        const isService = financialCalculator.isServiceProduct(productObj);
        if (!isService) {
          const hasFiles = !!movedLead.payment_proof_url && !!movedLead.contract_url;
          if (!(movedLead.pix_completed && movedLead.contract_signed && hasFiles)) {
            alert('Para mover para Ganho (Curso) é necessário:\n• Marcar Taxa Matrícula e Contrato assinado\n• Anexar Comprovante e Contrato (Vendedor na aba Informações)');
            return;
          }
        } else {
          // Requisitos para Professor (Serviço)
          if (!movedLead.professor_proof_url) {
            alert('Para mover para Ganho (Serviço) é necessário:\n• Anexar Comprovante de Pagamento (Professor na aba Turma)');
            return;
          }
        }
      }
    }

    await updateLeadStage(draggableId, newStageId);

    await updateLead(draggableId, {
      last_contact_at: new Date().toISOString(),
      status: targetStage?.name ?? '',
    });

    if (isGanhoTarget) {
      const movedLead = leads.find((l) => l.id === draggableId);
      if (movedLead) {
        const productObj = financialCalculator.findProduct(movedLead.product, products);
        const isService = financialCalculator.isServiceProduct(productObj);
        if (!isService) {
          setEnrollLead(movedLead);
        }
        triggerGanhoAnimation();
      }
    }
  };

  const handleEnrollConfirm = async (turmaId: string) => {
    if (!enrollLead) return;
    try {
      const result = await addAttendee(turmaId, {
        lead_id: enrollLead.id,
        name: enrollLead.name,
        photo: enrollLead.photo || `https://i.pravatar.cc/150?u=${enrollLead.id}`,
        responsible: enrollLead.responsible || '',
        status: 'matriculado',
        vendas: financialCalculator.getTotalContracted(enrollLead, products),
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
  const ganhoLeads = useMemo(() => {
    return filters.filteredLeads.filter(l =>
      l.stage_id && ganhoStageIds.has(l.stage_id)
    );
  }, [filters.filteredLeads, ganhoStageIds]);

  // Pago: valor efetivamente recebido (valor_recebido + taxa_matricula_recebido)
  const caixaTotalValue = useMemo(() => {
    return ganhoLeads.reduce((sum, lead) => {
      return sum + financialCalculator.getPaidAmount(lead, products);
    }, 0);
  }, [ganhoLeads, products]);

  // Pendente: valor contratado total (valor + taxa) menos o que já foi pago
  const competenciaTotalValue = useMemo(() => {
    return ganhoLeads.reduce((sum, lead) => {
      return sum + financialCalculator.getPendingAmount(lead, products);
    }, 0);
  }, [ganhoLeads, products]);



  return (
    <div className="p-6 space-y-4 bg-gray-50 flex-1 min-h-0 w-full flex flex-col overflow-hidden min-w-0 max-w-full">
      <PipelineHeader
        caixaTotalValue={caixaTotalValue}
        competenciaTotalValue={competenciaTotalValue}
        leadsCount={filters.filteredLeads.length}
        currentPipelineId={currentPipelineId ?? null}
        pipelines={pipelines}
        onPipelineChange={(id) => {
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
      />


      <PipelineFilters
        searchTerm={filters.searchTerm}
        selectedStatus={filters.selectedStatus}
        selectedProduct={filters.selectedProduct}
        selectedResponsible={filters.selectedResponsible}
        selectedStars={filters.selectedStars}
        responsibles={filters.responsibles}
        products={products}
        columns={COLUMNS}
        onSearchChange={filters.setSearchTerm}
        onStatusChange={filters.setSelectedStatus}
        onProductChange={filters.setSelectedProduct}
        onResponsibleChange={filters.setSelectedResponsible}
        onStarsChange={filters.setSelectedStars}
        clearAllFilters={filters.clearAllFilters}
        activeFilterCount={filters.activeFilterCount}
        isVendedor={isComercial}
      />

      <PipelineBoard
        filteredLeads={filters.filteredLeads}
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
          onStageChange={(stageId: string) => {
            const targetStage = currentPipeline?.stages.find(s => s.id === stageId);
            updateLeadStage(selectedLead.id, stageId);
            updateLead(selectedLead.id, { status: targetStage?.name ?? '' });
            const stageLower = targetStage?.name.toLowerCase() ?? '';
            if (stageLower.includes('ganho') || stageLower.includes('fechado') || stageLower.includes('aprovado')) {
              const productObj = products.find(p => p.name === selectedLead.product);
              const categoryName = (productObj?.category || '').toLowerCase();
              const isService = categoryName.startsWith('serviço') || categoryName.startsWith('servico');

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
          const isGanho = lead.stage_id && ganhoStageIds.has(lead.stage_id);
          if (isGanho) {
            const productObj = products.find(p => p.name === lead.product);
            const categoryName = (productObj?.category || '').toLowerCase();
            const isService = categoryName.startsWith('serviço') || categoryName.startsWith('servico');

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
