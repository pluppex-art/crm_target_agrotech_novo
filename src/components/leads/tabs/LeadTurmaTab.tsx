import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GraduationCap, Activity, Loader2, Plus, X, Calendar, MapPin } from 'lucide-react';
import { NewActivityModal } from '../../tasks/NewActivityModal';
import { uploadLeadFile, deleteLeadFile } from '../../../services/leadFilesService';
import { turmaService } from '../../../services/turmaService';
import { useTurmaStore } from '../../../store/useTurmaStore';
import type { TurmaAttendee } from '../../../services/turmaService';

// Sub-components
import { ProfessorDocumentation } from './lead-turma-tab/ProfessorDocumentation';
import { TurmaCard } from './lead-turma-tab/TurmaCard';

interface LeadTurmaTabProps {
  leadTurmas: any[];
  loadingTurmas: boolean;
  loadTurmas?: () => Promise<void>;
  leadId?: string;
  leadName?: string;
  updateAttendeePayment?: (attendeeId: string, valor_recebido: number, forma_pagamento: string, paid_at?: string | null) => Promise<void>;
  updateEnrollmentDates?: (enrollmentId: string, dates: { taxa_matricula_paid_at?: string | null; valor_recebido_paid_at?: string | null }) => Promise<void>;
  onActivityCreated?: () => void;
  formData?: any;
  updateFormField?: (updates: any) => void;
  toggleField?: (field: string, value: any) => Promise<void>;
  products?: any[];
}

interface PaymentEntry { valor: string; forma: string; }
interface PaymentState { open: boolean; entries: PaymentEntry[]; }
const FORMAS = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto Bancário', 'Dinheiro', 'Transferência Bancária', 'Cheque'];

export const LeadTurmaTab: React.FC<LeadTurmaTabProps> = ({
  leadTurmas, loadingTurmas, loadTurmas, leadId, leadName, updateAttendeePayment,
  updateEnrollmentDates, onActivityCreated, formData, updateFormField,
  toggleField, products = [],
}) => {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>({});
  const [loadingSave, setLoadingSave] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { turmas, fetchTurmas } = useTurmaStore();

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const ALLOWED_EXT = '.jpg,.jpeg,.png,.pdf';

  useEffect(() => {
    const initialPayments: Record<string, PaymentState> = {};
    leadTurmas.forEach(({ attendee }: { attendee: TurmaAttendee }) => {
      initialPayments[attendee.id] = { open: false, entries: [{ valor: '', forma: '' }] };
    });
    setPaymentStates(initialPayments);
  }, [leadTurmas]);

  useEffect(() => {
    if (showAddModal) {
      fetchTurmas();
    }
  }, [showAddModal, fetchTurmas]);

  const handleFileUpload = async (file: File) => {
    if (!leadId || !ALLOWED_TYPES.includes(file.type)) return;
    setUploading(true);
    try {
      const url = await uploadLeadFile(leadId, 'payment_proof', file);
      if (url) {
        updateFormField?.({ professor_proof_url: url });
        await toggleField?.('professor_proof_url', url);
        const firstEnrollmentId = leadTurmas[0]?.attendee?.id;
        if (firstEnrollmentId) await updateEnrollmentDates?.(firstEnrollmentId, { valor_recebido_paid_at: new Date().toISOString() });
      }
    } finally { setUploading(false); }
  };

  const handleDeleteFile = async () => {
    const url = formData?.professor_proof_url;
    if (!url || !confirm('Remover arquivo?')) return;
    await deleteLeadFile(url);
    updateFormField?.({ professor_proof_url: null });
    await toggleField?.('professor_proof_url', null);
  };

  const getPayment = (id: string) => paymentStates[id] ?? { open: false, entries: [{ valor: '', forma: '' }] };
  const updatePaymentState = (id: string, updates: Partial<PaymentState>) => setPaymentStates(prev => ({ ...prev, [id]: { ...getPayment(id), ...updates } }));

  const savePayment = async (attendeeId: string) => {
    const state = getPayment(attendeeId);
    const entry = state.entries[0];
    const val = parseFloat(entry.valor);
    if (isNaN(val) || val <= 0 || !entry.forma) return;
    setLoadingSave(attendeeId);
    try {
      await updateAttendeePayment?.(attendeeId, val, entry.forma, new Date().toISOString());
      updatePaymentState(attendeeId, { open: false, entries: [{ valor: '', forma: '' }] });
    } finally { setLoadingSave(null); }
  };

  const handleLinkTurma = async (turmaId: string) => {
    if (!leadId) return;
    setIsLinking(turmaId);
    try {
      await turmaService.addAttendee(turmaId, {
        lead_id: leadId,
        responsavel_usuario_id: formData?.responsavel_usuario_id,
        name: formData?.name || '',
        photo: formData?.photo || '',
        responsible: formData?.responsible || '',
        status: 'matriculado',
        vendas: 0,
        seller_origin: formData?.seller_origin || null,
        cost_center: formData?.cost_center || 'cursos'
      });
      if (loadTurmas) await loadTurmas();
      setShowAddModal(false);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'ALREADY_ENROLLED') {
        alert('Este lead já está matriculado nesta turma.');
      } else {
        alert('Erro ao vincular à turma.');
      }
    } finally {
      setIsLinking(null);
    }
  };

  const availableTurmas = useMemo(() => {
    const enrolledIds = new Set(leadTurmas.map(lt => lt.turma.id));
    return turmas.filter(t => !enrolledIds.has(t.id) && t.status !== 'concluida' && t.status !== 'cancelada');
  }, [turmas, leadTurmas]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turmas vinculadas</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          <Plus size={12} />
          Adicionar em outra turma
        </button>
      </div>

      <ProfessorDocumentation formData={formData} uploading={uploading} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} handleDeleteFile={handleDeleteFile} ALLOWED_EXT={ALLOWED_EXT} />

      {loadingTurmas ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
      ) : leadTurmas.length > 0 ? (
        leadTurmas.map(({ turma, attendee }: any) => (
          <TurmaCard
            key={turma.id}
            turma={turma}
            attendee={attendee}
            formData={formData}
            products={products}
            payment={getPayment(attendee.id)}
            handleToggle={(id, checked) => updatePaymentState(id, { open: checked, entries: [{ valor: '', forma: '' }] })}
            savePayment={savePayment}
            loadingSave={loadingSave}
            handleEntryChange={(id, idx, field, val) => {
              const state = getPayment(id);
              const entries = state.entries.map((e, i) => i === idx ? { ...e, [field]: val } : e);
              updatePaymentState(id, { entries });
            }}
            FORMAS={FORMAS}
            onReload={loadTurmas}
          />
        ))
      ) : (
        <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhuma turma vinculada.</p>
        </div>
      )}

      <div className="border border-dashed border-blue-100 rounded-2xl p-4 flex items-start gap-3 bg-blue-50/40">
        <Activity size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-600 leading-relaxed">Registre atividades relacionadas a este lead em <strong>Nova Atividade</strong>.</p>
      </div>

      <NewActivityModal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} leadId={leadId} leadName={leadName} onCreated={onActivityCreated} />

      {/* Modal - Adicionar em Outra Turma */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Adicionar em Outra Turma</h3>
                <p className="text-xs text-slate-400 mt-0.5">Selecione uma turma ativa abaixo para vincular o lead.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {availableTurmas.length > 0 ? (
                availableTurmas.map(t => (
                  <div
                    key={t.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight">{t.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Professor: {t.professor_name || 'A definir'}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} className="text-emerald-500" />
                          {t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'A definir'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={10} className="text-emerald-500" />
                          {t.location || 'A definir'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleLinkTurma(t.id)}
                      disabled={isLinking === t.id}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-700/60 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1"
                    >
                      {isLinking === t.id ? <Loader2 size={12} className="animate-spin" /> : 'Vincular'}
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Nenhuma outra turma ativa disponível.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
