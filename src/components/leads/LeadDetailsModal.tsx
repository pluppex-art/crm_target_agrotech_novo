
import { motion } from 'framer-motion';

import { LeadInfoTab } from './tabs/LeadInfoTab';
import { LeadHistoryTab } from './tabs/LeadHistoryTab';
import { LeadNotesTab } from './tabs/LeadNotesTab';
import { LeadTasksTab } from './tabs/LeadTasksTab';
import { LeadTurmaTab } from './tabs/LeadTurmaTab';
import { LeadChecklistTab } from './tabs/LeadChecklistTab';
import { useLeadForm } from '../../hooks/useLeadForm';
import { useLeadNotes } from '../../hooks/useLeadNotes';
import { useLeadTasks } from '../../hooks/useLeadTasks';
import { useLeadTurmas } from '../../hooks/useLeadTurmas';
import { useLeadChecklist } from '../../hooks/useLeadChecklist';
import { useProductStore } from '../../store/useProductStore';
import { useProfileStore } from '../../store/useProfileStore';
import { financialCalculator } from '../../services/financialCalculator';

import { X, Trophy, ThumbsDown, Phone, PhoneOff, Loader2, Brain } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LeadDetailsModalProps, TabType } from './types';
import { cn } from '@/lib/utils';
import { useLeadStore } from '../../store/useLeadStore';
import { useTaskStore } from '../../store/useTaskStore';
import { callService } from '../../services/callService';
import { noteService } from '../../services/noteService';
import { useAuthStore } from '../../store/useAuthStore';
import type { DetectedTask } from '../../services/voiceTranscriptionService';
import { AICopilotPanel } from './AICopilotPanel';
import { StageReasonModal } from './StageReasonModal';
import { stageReasonService, type StageReason } from '../../services/stageReasonService';

const TURMA_STAGES = [
  { id: 'matriculado' as const, name: 'Matriculado', color: 'bg-blue-500' },
  { id: 'cancelado' as const, name: 'Cancelado', color: 'bg-red-500' },
  { id: 'indeciso' as const, name: 'Indeciso', color: 'bg-amber-500' },
  { id: 'confirmado' as const, name: 'Confirmado', color: 'bg-emerald-500' }
];

const STAGE_CLASSES = {
  active: `bg-emerald-500 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30`,
  inactive: `border-emerald-500 text-emerald-600 hover:text-emerald-700 hover:border-emerald-600`,
};

const LeadDetailsModal: React.FC<LeadDetailsModalProps & { initialTab?: TabType }> = ({
  isOpen,
  onClose,
  lead,
  pipelineStages,
  currentStageId,
  onStageChange,
  turmaAttendee,
  onTurmaStatusChange,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab ?? 'info');
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState<string | null>(null);
  const [showCopilot, setShowCopilot] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState<{ stageId: string; stageName: string } | null>(null);

  const { user } = useAuthStore();
  const { deleteLead } = useLeadStore();
  const { addTask } = useTaskStore();

  const handleVoiceTaskDetected = async (task: DetectedTask) => {
    if (!user?.id) return;
    await addTask({
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      scheduled_time: task.scheduled_time ?? undefined,
      status: 'pending',
      priority: 'medium',
      category: 'follow_up',
      lead_id: lead.id,
      lead_name: lead.name,
      responsavel_usuario_id: user.id,
    });
  };

  const handleClose = () => {
    if (isCallInProgress) {
      setShowLockWarning(true);
      return;
    }
    onClose();
  };

  const handleLogCallDirect = async (type: 'atendida' | 'nao_atendida') => {
    if (!user?.id || isLoggingCall) return;
    setIsLoggingCall(type);
    try {
      const atendidasCount = await callService.getLeadCountByType(lead.id, 'atendida');
      const naoAtendidasCount = await callService.getLeadCountByType(lead.id, 'nao_atendida');
      const currentTotal = atendidasCount + naoAtendidasCount;
      const nextAttempt = currentTotal + 1;
      const icon = type === 'atendida' ? '✅' : '❌';
      const label = type === 'atendida' ? 'Atendida' : 'Não Atendida';
      
      const ok = await callService.logCall(user.id, lead.id, type);
      if (!ok) return;

      const authorName = profiles.find(p => p.id === user?.id)?.name || user?.email || 'Usuário';
      await noteService.createNote({
        content: `${icon} Registro de Chamada: Tentativa nº ${nextAttempt} - ${label}`,
        lead_id: lead.id,
        author_id: user.id,
        author_name: authorName,
      });

      window.dispatchEvent(new CustomEvent('refresh-lead-notes', { detail: { leadId: lead.id } }));
      window.dispatchEvent(new CustomEvent('refresh-lead-calls', { detail: { leadId: lead.id } }));
      
      setIsCallInProgress(false);
      setShowLockWarning(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingCall(null);
    }
  };

  const form = useLeadForm({ lead, onClose: handleClose });
  const { products } = useProductStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const leadNotes = useLeadNotes({ leadId: lead?.id ?? '' });
  const leadTasks = useLeadTasks({ leadId: lead?.id ?? '' });
  const leadTurmas = useLeadTurmas({ leadId: lead?.id ?? '' });
  const leadChecklist = useLeadChecklist({ leadId: lead?.id ?? '', stageId: currentStageId ?? '' });

  // Fetch profiles on mount if empty
  useEffect(() => {
    if (profiles.length === 0) {
      fetchProfiles();
    }
  }, [profiles.length, fetchProfiles]);

  // Build vendedores list from all active profiles
  const vendedores = useMemo(() => {
    const list = profiles
      .filter(p => p.status === 'active' || !p.status)
      .filter(p => {
        const roleName = p.cargos?.name?.toLowerCase() || '';
        const dept = p.department?.toLowerCase() || '';

        return (
          roleName.includes('consultor') ||
          roleName.includes('vendedor') ||
          roleName.includes('closer') ||
          roleName.includes('gerente') ||
          dept.includes('vendas') ||
          dept.includes('comercial')
        );
      })
      .filter(p => p.id && p.name)
      .map(p => ({ id: p.id, name: p.name as string }));

    // Always include the lead's current responsible even if not in list
    const hasCurrentResp = list.some(v => v.id === lead?.responsavel_usuario_id || v.name === lead?.responsible);
    if (lead?.responsible && !hasCurrentResp) {
      const fallbackId = lead.responsavel_usuario_id || lead.responsible;
      return [{ id: fallbackId, name: lead.responsible }, ...list];
    }
    return list;
  }, [profiles, lead?.responsible, lead?.responsavel_usuario_id]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Always include the lead's current product or the currently selected product in the form
      if (p.id === lead.product || p.name === lead.product) return true;
      if (p.id === form.formData.product || p.name === form.formData.product) return true;
      
      // Exclude concluded or canceled
      return p.status !== 'concluida' && p.status !== 'cancelada';
    });
  }, [products, lead.product, form.formData.product]);

  const currentUserProfile = profiles.find(p => p.id === user?.id);
  const isAdmin =
    currentUserProfile?.cargos?.name?.toLowerCase() === 'administrador' ||
    (currentUserProfile?.cargos?.permissions || []).includes('admin.all') ||
    (currentUserProfile?.cargos?.permissions || []).includes('leads.delete');

  const isTurmaMode = !!turmaAttendee;
  const stages = isTurmaMode ? TURMA_STAGES : pipelineStages;
  const currentStageData = stages?.find(s => s.id === currentStageId);
  const currentStageName = ((currentStageData as any)?.title || (currentStageData as any)?.name || '') as string;
  const isPerdidoStage = currentStageName.toLowerCase().includes('perdido');

  // Show confirmations in all stages except Lost (including Ganho — already checked)
  const showConfirmations = !isPerdidoStage;

  const currentProduct = useMemo(() =>
    financialCalculator.findProduct(form.formData.product, products),
    [form.formData.product, products]);

  const isServiceProduct = financialCalculator.isServiceProduct(currentProduct);

  // Para produtos de Serviço: o comprovante do professor é enviado no dia da turma,
  // não é requisito para entrar em Ganho. Só cursos exigem os 4 campos.
  const canMoveToGanho = isServiceProduct
    ? true  // Serviço: sem requisito de arquivo na entrada em Ganho
    : (
      form.formData.pix_completed &&
      form.formData.contract_signed &&
      !!form.formData.payment_proof_url &&
      !!form.formData.contract_url
    );

  // Unified stage change handler: delegates to turma or pipeline handler
  const handleStageChange = (stageId: string) => {
    if (isTurmaMode && turmaAttendee && onTurmaStatusChange) {
      onTurmaStatusChange(turmaAttendee.turmaId, turmaAttendee.attendeeId, stageId as any);
      return;
    }

    const targetStage = pipelineStages?.find(s => s.id === stageId);
    const targetName = ((targetStage as any)?.title || (targetStage as any)?.name || '') as string;
    const targetNameLower = targetName.toLowerCase();
    const isGanho = targetNameLower.includes('ganho') || targetNameLower.includes('fechado') || targetNameLower.includes('aprovado');

    if (isGanho && !canMoveToGanho) {
      alert('Para mover para Ganho (Curso) é necessário:\n• Marcar Taxa Matrícula e Contrato assinado\n• Anexar Comprovante e Contrato (Vendedor na aba Informações)');
      return;
    }

    // Gate: Aquecimento / Perdido require a reason
    if (stageReasonService.requiresReason(targetName)) {
      setPendingStageChange({ stageId, stageName: targetName });
      return;
    }

    onStageChange?.(stageId);
  };

  const handleStageReasonConfirmed = async (reason: StageReason, notes: string) => {
    if (!pendingStageChange || !user?.id) return;
    await stageReasonService.saveReason({
      lead_id: lead.id,
      lead_name: lead.name,
      stage_name: pendingStageChange.stageName,
      reason,
      notes,
      recorded_by: user.id,
    });
    onStageChange?.(pendingStageChange.stageId);
    setPendingStageChange(null);
  };

  // Must ALWAYS have confirmations to move to Ganho
  if (!lead) return null;

  // Para serviço não há barra de progress na entrada em Ganho
  const totalSteps = isServiceProduct ? 0 : 4;
  const completedSteps = isServiceProduct
    ? 0
    : [
      form.formData.pix_completed,
      form.formData.contract_signed,
      !!form.formData.payment_proof_url,
      !!form.formData.contract_url,
    ].filter(Boolean).length;

  // Checklist blocks advancing to any stage (except Perdido) until all required items are done
  const checklistBlocked = !isTurmaMode && leadChecklist.totalCount > 0 && !leadChecklist.allRequiredCompleted;

  const ganhoStage = pipelineStages?.find(s => {
    const n = ((s as any).title || (s as any).name || '').toLowerCase();
    return n.includes('ganho') || n.includes('fechado') || n.includes('aprovado');
  });
  const perdidoStage = pipelineStages?.find(s => {
    const n = ((s as any).title || (s as any).name || '').toLowerCase();
    return n.includes('perdido');
  });

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.')) return;
    await deleteLead(lead.id);
    handleClose();
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden isolation-auto">
      {/* Backdrop */}
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
      />
      <motion.div
        key="modal-content"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="bg-white dark:bg-slate-900 shadow-2xl w-full sm:max-w-[680px] h-full flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800 relative transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pt-5 pb-2 px-4 sm:px-5 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800">
          {/* Top bar: Ganho / Perdido + close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {!isTurmaMode && (
                <>
                  <button
                    onClick={() => {
                      if (!canMoveToGanho || checklistBlocked) return;
                      handleStageChange(ganhoStage?.id || '');
                    }}
                    disabled={!canMoveToGanho || checklistBlocked || currentStageId === ganhoStage?.id}
                    title={
                      checklistBlocked
                        ? 'Conclua o checklist da etapa antes de avançar'
                        : !canMoveToGanho
                          ? 'Necessário: Taxa Matrícula + Contrato assinado + Comprovante + Contrato ( Vendedor )'
                          : undefined
                    }
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm",
                      currentStageId === ganhoStage?.id
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : (canMoveToGanho && !checklistBlocked)
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          : "border-slate-200 dark:border-slate-700 text-slate-400 bg-white dark:bg-slate-900 cursor-not-allowed"
                    )}
                  >
                    <Trophy size={14} className={currentStageId === ganhoStage?.id ? "text-white" : (canMoveToGanho && !checklistBlocked) ? "text-emerald-500" : "text-slate-400"} />
                    <span key="label">Ganho</span>
                    {showConfirmations && !isServiceProduct && (
                      <span key="conf" className={cn(
                        "ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors",
                        canMoveToGanho
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600"
                      )}>
                        {completedSteps}/{totalSteps}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleStageChange(perdidoStage?.id || '')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-bold transition-colors shadow-sm"
                  >
                    <ThumbsDown size={14} className="text-red-500" />
                    <span key="label">Perdido</span>
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowCopilot((v) => !v)}
                title="IA Copilot — qualificação BANT em tempo real"
                className={cn(
                  'p-1.5 rounded-full transition-colors',
                  showCopilot
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-violet-600 dark:hover:bg-slate-800 dark:hover:text-violet-400',
                )}
              >
                <Brain size={18} />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:bg-slate-800/50 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stage buttons */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">Etapa:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {(stages || []).map((stage: any) => {
                const stageName = stage.title || stage.name;
                const { active, inactive } = STAGE_CLASSES
                const isActive = currentStageId === stage.id;
                const lowName = (stageName as string)?.toLowerCase();
                const isGanhoBtn = !isTurmaMode && (lowName.includes('ganho') || lowName.includes('fechado') || lowName.includes('aprovado'));
                const isPerdidoBtn = !isTurmaMode && lowName.includes('perdido');
                const isDisabled = (isGanhoBtn && !canMoveToGanho) || (!isActive && !isPerdidoBtn && checklistBlocked);
                return (
                  <button
                    key={stage.id}
                    onClick={() => !isDisabled && handleStageChange(stage.id)}
                    disabled={isDisabled}
                    title={
                      checklistBlocked && !isActive && !isPerdidoBtn
                        ? 'Conclua o checklist da etapa antes de avançar'
                        : isGanhoBtn && !canMoveToGanho
                          ? 'Necessário: Taxa Matrícula + Contrato assinado + Comprovante + Contrato ( Vendedor )'
                          : undefined
                    }
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border shadow-sm",
                      isActive ? active : inactive,
                      isActive ? "hover:shadow-md" : "bg-white dark:bg-slate-800 dark:border-slate-700 hover:shadow-sm",
                      isDisabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {stageName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 sm:gap-5 px-4 sm:px-5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {(['info', 'notes', 'history', 'tasks', 'turma', 'checklist'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative pb-3 pt-2 font-bold text-xs transition-colors border-b-[2px] uppercase tracking-wider shrink-0',
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-200 dark:border-slate-700 dark:hover:border-slate-700'
              )}
            >
              {tab === 'info' && 'Informações'}
              {tab === 'notes' && 'Notas'}
              {tab === 'history' && 'Histórico'}
              {tab === 'tasks' && 'Tarefas'}
              {tab === 'turma' && 'Turma'}
              {tab === 'checklist' && leadChecklist.totalCount > 0 ? (
                <span className="flex items-center gap-1">
                  Checklist
                  <span className={cn(
                    "inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black",
                    leadChecklist.allRequiredCompleted ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
                  )}>
                    {leadChecklist.requiredCompleted}/{leadChecklist.requiredTotal}
                  </span>
                </span>
              ) : tab === 'checklist' && 'Checklist'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {activeTab === 'info' && (
            <div>
              <LeadInfoTab
                lead={lead}
                formData={form.formData}
                products={filteredProducts}
                fieldErrors={form.fieldErrors}
                whatsappUrl={form.whatsappUrl}
                calculateFinalValue={form.calculateFinalValue}
                hoverStars={form.hoverStars}
                setHoverStars={form.setHoverStars}
                updateFormField={form.updateFormField}
                toggleField={form.toggleField}
                handleSave={form.handleSave}
                isSaving={form.isSaving}
                onDelete={handleDelete}
                onCancel={handleClose}
                canDelete={isAdmin}
                isCallInProgress={isCallInProgress}
                setIsCallInProgress={setIsCallInProgress}
                currentStageName={currentStageName}
                showConfirmations={showConfirmations}
                responsibles={vendedores}
                pixCompleted={form.formData.pix_completed}
                contractSigned={form.formData.contract_signed}
                onPixComplete={(v) => form.toggleField('pix_completed', v)}
                onContractSign={(v) => form.toggleField('contract_signed', v)}
                onPaymentProofUploaded={async () => {
                  const enrollmentId = leadTurmas.leadTurmas[0]?.attendee?.id;
                  if (enrollmentId) {
                    await leadTurmas.updateEnrollmentDates(enrollmentId, {
                      taxa_matricula_paid_at: new Date().toISOString(),
                    });
                  }
                }}
              />
            </div>
          )}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <LeadHistoryTab lead={lead} />
            </div>
          )}
          {activeTab === 'notes' && (
            <LeadNotesTab
              {...leadNotes}
              leadName={lead.name}
              onVoiceTaskDetected={handleVoiceTaskDetected}
            />
          )}
          {activeTab === 'tasks' && (
            <LeadTasksTab
              {...leadTasks}
              leadId={lead.id}
              leadName={lead.name}
            />
          )}
          {activeTab === 'turma' && (
            <LeadTurmaTab
              {...leadTurmas}
              leadId={lead.id}
              leadName={lead.name}
              formData={form.formData}
              updateFormField={form.updateFormField}
              toggleField={form.toggleField}
              products={filteredProducts}
            />
          )}
          {activeTab === 'checklist' && (
            <LeadChecklistTab {...leadChecklist} />
          )}
        </div>
      </motion.div>

      {/* Stage reason modal — Aquecimento / Perdido */}
      {pendingStageChange && (
        <StageReasonModal
          stageName={pendingStageChange.stageName}
          leadName={lead.name}
          onConfirm={handleStageReasonConfirmed}
          onCancel={() => setPendingStageChange(null)}
        />
      )}

      <AnimatePresence>
        {showCopilot && (
          <AICopilotPanel
            leadId={lead.id}
            leadName={lead.name}
            leadCompany={lead.company ?? undefined}
            stageName={currentStageName}
            existingNotes={
              leadNotes.notes.length > 0
                ? leadNotes.notes
                    .slice(0, 12)
                    .map((n: { content: string }) => n.content)
                    .join('\n')
                : undefined
            }
            onClose={() => setShowCopilot(false)}
          />
        )}
      </AnimatePresence>

      {showLockWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[4px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl w-full max-w-sm p-6 space-y-6 text-center border border-slate-100 dark:border-slate-800 relative"
          >
            <button
              onClick={() => setShowLockWarning(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 dark:bg-slate-800/50 hover:text-slate-600 dark:text-slate-400 rounded-full transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                <Phone size={22} className="stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight">📞 Registrar Chamada</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                Você iniciou um contato por WhatsApp com <span className="font-extrabold text-slate-700 dark:text-slate-300">{lead.name}</span>. Como foi o retorno da ligação?
              </p>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              {/* Atendida */}
              <button
                onClick={() => handleLogCallDirect('atendida')}
                disabled={!!isLoggingCall}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 w-24 h-24 rounded-2xl border-2 transition-all shadow-sm",
                  "bg-emerald-50/50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 hover:scale-105 active:scale-95",
                  isLoggingCall && "opacity-50 cursor-not-allowed"
                )}
              >
                {isLoggingCall === 'atendida' ? <Loader2 size={24} className="animate-spin" /> : <Phone size={26} className="stroke-[2.5]" />}
                <span className="text-[10px] font-black uppercase tracking-wider">Atendida</span>
              </button>

              {/* Não Atendida */}
              <button
                onClick={() => handleLogCallDirect('nao_atendida')}
                disabled={!!isLoggingCall}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 w-24 h-24 rounded-2xl border-2 transition-all shadow-sm",
                  "bg-red-50/50 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300 hover:scale-105 active:scale-95",
                  isLoggingCall && "opacity-50 cursor-not-allowed"
                )}
              >
                {isLoggingCall === 'nao_atendida' ? <Loader2 size={24} className="animate-spin" /> : <PhoneOff size={26} className="stroke-[2.5]" />}
                <span className="text-[10px] font-black uppercase tracking-wider">N/Atend.</span>
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2 border-t border-slate-100 dark:border-slate-800">
              Registro Obrigatório
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export { LeadDetailsModal };
