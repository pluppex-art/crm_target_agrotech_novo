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
import { useAuthStore } from '../store/useAuthStore';
import type { Lead } from '../types/leads';
import { LeadDetailsModal } from '../components/leads/LeadDetailsModal';
import { NewLeadModal } from '../components/leads/NewLeadModal';
import { cn, getLeadEffectiveValue } from '../lib/utils';
import { requestNotificationPermission } from '../services/alertService';
import { EnrollInTurmaModal } from '../components/pipeline/EnrollInTurmaModal';
import { LeadCard } from '../components/pipeline/LeadCard';
import { checklistService } from '../services/checklistService';





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

  const toggleColumnMinimized = (colId: string) => {
    setMinimizedColumns(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  // Background alerts continue firing
  usePipelineAlerts(leads);

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
  }, [fetchPipelines, fetchTurmas, fetchProducts, fetchProfiles]);



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
    return () => {
      unsubLeads();
      unsubPipelines();
      unsubTurmas();
      unsubProducts();
    };
  }, [subscribeToLeads, subscribePipelines, subscribeTurmas, subscribeProducts]);




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

    // Bloqueia arrastar para Ganho sem confirmações
    if (isGanhoTarget) {
      const movedLead = leads.find((l) => l.id === draggableId);
      if (movedLead) {
        const productObj = products.find(p => p.name === movedLead.product);
        const categoryName = (productObj?.category || '').toLowerCase();
        const isService = categoryName.startsWith('serviço') || categoryName.startsWith('servico');
        if (!isService && !(movedLead.pix_completed && movedLead.contract_signed)) {
          alert('Para mover para Ganho, marque PIX realizado e Contrato assinado no lead.');
          return;
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
        const productObj = products.find(p => p.name === movedLead.product);
        const categoryName = (productObj?.category || '').toLowerCase();
        const isService = categoryName.startsWith('serviço') || categoryName.startsWith('servico');
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
        vendas: getLeadEffectiveValue(enrollLead),
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

  const currentPipeline = pipelines.find(p => p.id === currentPipelineId);
  const COLUMNS = currentPipeline?.stages.map(s => ({
    id: s.id,
    title: s.name,
    color: s.color || 'bg-blue-500'
  })) || [];

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

  // Leads em etapa Ganho: responde ao filtro de responsável (todos quando "all", ou somente o selecionado)
  const ganhoLeads = useMemo(() => {
    return leads.filter(l => {
      if (!l.stage_id || !ganhoStageIds.has(l.stage_id)) return false;
      if (filters.selectedResponsible !== 'all' && l.responsible !== filters.selectedResponsible) return false;
      return true;
    });
  }, [leads, ganhoStageIds, filters.selectedResponsible]);

  // Helper: acha produto pelo nome do lead usando includes (ignora caixa e sufixos de data/local)
  const findProductForLead = (leadProduct: string) =>
    products.find(p => {
      const pName = p.name.toLowerCase().trim();
      const lName = leadProduct.toLowerCase().trim();
      return lName === pName || lName.includes(pName);
    });

  // Ganho Caixa: valor recebido (venda + taxa de matrícula)
  const caixaTotalValue = useMemo(() => {
    const ganhoLeadIds = new Set(ganhoLeads.map(l => l.id));

    const leadTotal = ganhoLeads.reduce((sum, lead) => {
      let total = 0;
      if (lead.valor_recebido != null) total += lead.valor_recebido;
      if (lead.taxa_matricula_recebido != null) {
        total += lead.taxa_matricula_recebido;
      } else if (lead.pix_completed) {
        const product = findProductForLead(lead.product);
        total += (product?.enrollment_fee ?? 0);
      }
      return sum + total;
    }, 0);

    const turmaTotal = turmas.reduce((sum, turma) => {
      return sum + turma.attendees.reduce((s, a) => {
        if (a.lead_id && ganhoLeadIds.has(a.lead_id) && a.valor_recebido != null) {
          return s + a.valor_recebido;
        }
        return s;
      }, 0);
    }, 0);

    return leadTotal + turmaTotal;
  }, [ganhoLeads, products, turmas]);

  // Competências: valor de venda + taxa de matrícula dos leads em etapa Ganho
  const competenciaTotalValue = useMemo(() => {
    const ganhoLeadIds = new Set(ganhoLeads.map(l => l.id));

    const leadCompetencia = ganhoLeads.reduce((sum, lead) => {
      const product = findProductForLead(lead.product);
      const enrollmentFee = product?.enrollment_fee ?? 0;
      return sum + getLeadEffectiveValue(lead) + enrollmentFee;
    }, 0);

    const turmaCompetencia = turmas.reduce((sum, turma) => {
      return sum + turma.attendees.reduce((s, a) => {
        if (a.lead_id && ganhoLeadIds.has(a.lead_id)) {
          return s + (a.vendas || 0);
        }
        return s;
      }, 0);
    }, 0);

    return leadCompetencia + turmaCompetencia;
  }, [ganhoLeads, products, turmas]);



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
          setEnrollLead(lead);
          triggerGanhoAnimation();
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
