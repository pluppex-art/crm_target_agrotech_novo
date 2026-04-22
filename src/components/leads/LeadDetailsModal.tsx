
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
import type { Lead } from '../../types/leads';

import {
  X,
  Trophy,
  ThumbsDown,
  MessageSquare,
  CheckSquare,
  GraduationCap,
  Upload,
  Eye,
  X as XIcon,
  Loader2,
  QrCode,
  FileText,
} from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import { LeadDetailsModalProps, TabType } from './types';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { uploadLeadFile, deleteLeadFile } from '../../services/leadFilesService';

// Maps Tailwind bg-* classes to hex colors for inline styling
const STAGE_COLOR_MAP: Record<string, string> = {
  'bg-slate-500': '#64748b', 'bg-gray-500': '#6b7280',
  'bg-red-500': '#ef4444', 'bg-orange-500': '#f97316',
  'bg-amber-500': '#f59e0b', 'bg-yellow-500': '#eab308',
  'bg-lime-500': '#84cc16', 'bg-green-500': '#22c55e',
  'bg-emerald-500': '#10b981', 'bg-teal-500': '#14b8a6',
  'bg-cyan-500': '#06b6d4', 'bg-sky-500': '#0ea5e9',
  'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1',
  'bg-violet-500': '#8b5cf6', 'bg-purple-500': '#a855f7',
  'bg-fuchsia-500': '#d946ef', 'bg-pink-500': '#ec4899',
  'bg-rose-500': '#f43f5e',
};

const TURMA_STAGES = [
  { id: 'matriculado' as const, name: 'Matriculado', color: 'bg-blue-500' },
  { id: 'cancelado' as const, name: 'Cancelado', color: 'bg-red-500' },
  { id: 'indeciso' as const, name: 'Indeciso', color: 'bg-amber-500' },
  { id: 'confirmado' as const, name: 'Confirmado', color: 'bg-emerald-500' }
];

function getStageClasses(colorClass: string): { active: string; inactive: string } {
  const baseColor = colorClass.replace('bg-', '');
  return {
    active: `bg-emerald-500 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30`,
    inactive: `border-emerald-500 text-emerald-600 hover:text-emerald-700 hover:border-emerald-600`
  };
}



const LeadDetailsModal: React.FC<LeadDetailsModalProps & { initialTab?: TabType }> = ({
  isOpen,
  onClose,
  lead,
  pipelineStages,
  currentStageId,
  onStageChange,
  turmaAttendee,
  onTurmaStatusChange,
  responsibles,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab ?? 'info');
  const form = useLeadForm({ lead, onClose });
  const { products } = useProductStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const leadNotes = useLeadNotes({ leadId: lead?.id ?? '' });
  const leadTasks = useLeadTasks({ leadId: lead?.id ?? '' });
  const leadTurmas = useLeadTurmas({ leadId: lead?.id ?? '' });
  const leadChecklist = useLeadChecklist({ leadId: lead?.id ?? '', stageId: currentStageId ?? '' });

  // Upload Logic
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const ALLOWED_EXT = '.jpg,.jpeg,.png,.pdf';

  const handleFileUpload = async (
    file: File,
    fileType: 'payment_proof' | 'contract',
    setLoading: (v: boolean) => void
  ) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Formato inválido. Use .JPEG, .PNG ou .PDF');
      return;
    }
    setLoading(true);
    try {
      const url = await uploadLeadFile(lead!.id, fileType, file);
      if (url) {
        const field = fileType === 'payment_proof' ? 'payment_proof_url' : 'contract_url';
        form.updateFormField({ [field]: url });
        await form.toggleField(field, url);
      } else {
        alert('Falha ao enviar arquivo. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileType: 'payment_proof' | 'contract') => {
    const field = fileType === 'payment_proof' ? 'payment_proof_url' : 'contract_url';
    const url = form.formData[field];
    if (!url) return;
    if (!confirm('Remover este arquivo?')) return;
    await deleteLeadFile(url);
    form.updateFormField({ [field]: null });
    await form.toggleField(field, null);
  };

  // Build vendedores list from Comercial department profiles
  const vendedores = useMemo(() => {
    if (profiles.length === 0) fetchProfiles();
    const comercial = profiles.filter(p =>
      p.department?.toLowerCase() === 'comercial' && (p.status === 'active' || !p.status)
    );
    // Fallback: all active profiles if no comercial members found
    const list = comercial.length > 0
      ? comercial
      : profiles.filter(p => p.status === 'active' || !p.status);
    // Always include the lead's current responsible even if not in list
    const names = list.map(p => p.name as string).filter(Boolean);
    if (lead?.responsible && !names.includes(lead.responsible)) {
      return [lead.responsible, ...names];
    }
    return names;
  }, [profiles, lead?.responsible]);
  const isTurmaMode = !!turmaAttendee;
  const stages = isTurmaMode ? TURMA_STAGES : pipelineStages;
  const currentStageData = stages?.find(s => s.id === currentStageId);
  const currentStageName = ((currentStageData as any)?.title || (currentStageData as any)?.name || '') as string;
  const isPerdidoStage = currentStageName.toLowerCase().includes('perdido');

  // Show confirmations in all stages except Lost (including Ganho — already checked)
  const showConfirmations = !isPerdidoStage;

  // Unified stage change handler: delegates to turma or pipeline handler
  const handleStageChange = (stageId: string) => {
    if (isTurmaMode && turmaAttendee && onTurmaStatusChange) {
      onTurmaStatusChange(turmaAttendee.turmaId, turmaAttendee.attendeeId, stageId as any);
    } else {
      // Auto-check PIX and contract when moving to Ganho
      const targetStage = pipelineStages?.find(s => s.id === stageId);
      const targetName = ((targetStage as any)?.title || (targetStage as any)?.name || '').toLowerCase();
      if (targetName.includes('ganho') || targetName.includes('fechado') || targetName.includes('aprovado')) {
        if (!form.formData.pix_completed) form.toggleField('pix_completed', true);
        if (!form.formData.contract_signed) form.toggleField('contract_signed', true);
      }
      onStageChange?.(stageId);
    }
  };

  // Must ALWAYS have confirmations to move to Ganho
  if (!lead) return null;

  const currentProduct = useMemo(() => 
    financialCalculator.findProduct(form.formData.product, products),
  [form.formData.product, products]);

  const isServiceProduct = financialCalculator.isServiceProduct(currentProduct);

  const canMoveToGanho = isServiceProduct 
    ? (!!form.formData.professor_proof_url)
    : (
        form.formData.pix_completed &&
        form.formData.contract_signed &&
        !!form.formData.payment_proof_url &&
        !!form.formData.contract_url
      );

  const totalSteps = isServiceProduct ? 1 : 4;
  const completedSteps = isServiceProduct 
    ? [!!form.formData.professor_proof_url].filter(Boolean).length
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
    return n.includes('ganho');
  });
  const perdidoStage = pipelineStages?.find(s => {
    const n = ((s as any).title || (s as any).name || '').toLowerCase();
    return n.includes('perdido');
  });

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('leads').delete().eq('id', lead.id);
    if (error) {
      console.error('Error deleting lead:', error);
      alert('Erro ao excluir lead');
      return;
    }
    onClose();
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
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        />
        <motion.div
          key="modal-content"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          className="bg-white shadow-2xl w-full max-w-[680px] h-full flex flex-col overflow-hidden border-l border-slate-200 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="pt-5 pb-2 px-5 flex flex-col gap-3 border-b border-slate-100">
            {/* Top bar: Ganho / Perdido + close */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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
                            ? (isServiceProduct 
                                ? 'Necessário: Comprovante ( Professor )' 
                                : 'Necessário: Taxa Matrícula + Contrato assinado + Comprovante + Contrato ( Vendedor )')
                            : undefined
                      }
                      className={cn(
                        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm",
                        currentStageId === ganhoStage?.id
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : (canMoveToGanho && !checklistBlocked)
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            : "border-slate-200 text-slate-400 bg-white cursor-not-allowed"
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
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stage buttons */}
            <div className="flex items-center gap-2 w-full">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">Etapa:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: 'thin' }}>
                {(stages || []).map(stage => {
                  const stageName = (stage as any).title || (stage as any).name;
                  const { active, inactive } = getStageClasses(stage.color);
                  const isActive = currentStageId === stage.id;
                  const isGanhoBtn = !isTurmaMode && (stageName as string)?.toLowerCase().includes('ganho');
                  const isPerdidoBtn = !isTurmaMode && (stageName as string)?.toLowerCase().includes('perdido');
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
                            ? (isServiceProduct 
                                ? 'Necessário: Comprovante ( Professor )' 
                                : 'Necessário: Taxa Matrícula + Contrato assinado + Comprovante + Contrato ( Vendedor )')
                            : undefined
                      }
                      className={cn(
                        "px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border shadow-sm",
                        isActive ? active : inactive,
                        isActive ? "hover:shadow-md" : "bg-white hover:shadow-sm",
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
          <div className="flex gap-5 px-5 border-b border-slate-200">
{(['info', 'notes', 'history', 'tasks', 'turma', 'checklist'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'relative pb-3 pt-2 font-bold text-xs transition-colors border-b-[2px] uppercase tracking-wider',
                  activeTab === tab
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
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
                  products={products}
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
                  onCancel={onClose}
                  currentStageName={currentStageName}
                  showConfirmations={showConfirmations}
                  responsibles={vendedores}
                  pixCompleted={form.formData.pix_completed}
                  contractSigned={form.formData.contract_signed}
                  onPixComplete={(v) => form.toggleField('pix_completed', v)}
                  onContractSign={(v) => form.toggleField('contract_signed', v)}
                />
              </div>
            )}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <LeadHistoryTab lead={lead} />
              </div>
            )}
            {activeTab === 'notes' && (
              <LeadNotesTab {...leadNotes} />
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
                valorRecebido={form.formData.valor_recebido}
                leadValue={financialCalculator.getTotalContracted(form.formData, products)}
                formData={form.formData}
                updateFormField={form.updateFormField}
                toggleField={form.toggleField}
                products={products}
              />
            )}
            {activeTab === 'checklist' && (
              <LeadChecklistTab {...leadChecklist} />
            )}
          </div>
        </motion.div>
      </div>
  );
};

export { LeadDetailsModal };
