import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Activity, Loader2 } from 'lucide-react';
import { NewActivityModal } from '../../tasks/NewActivityModal';
import { uploadLeadFile, deleteLeadFile } from '../../../services/leadFilesService';
import type { TurmaAttendee } from '../../../services/turmaService';

// Sub-components
import { ProfessorDocumentation } from './lead-turma-tab/ProfessorDocumentation';
import { TurmaCard } from './lead-turma-tab/TurmaCard';

interface LeadTurmaTabProps {
  leadTurmas: any[];
  loadingTurmas: boolean;
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
  leadTurmas, loadingTurmas, leadId, leadName, updateAttendeePayment,
  updateEnrollmentDates, onActivityCreated, formData, updateFormField,
  toggleField, products = [],
}) => {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>({});
  const [loadingSave, setLoadingSave] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const ALLOWED_EXT = '.jpg,.jpeg,.png,.pdf';

  useEffect(() => {
    const initialPayments: Record<string, PaymentState> = {};
    leadTurmas.forEach(({ attendee }: { attendee: TurmaAttendee }) => {
      initialPayments[attendee.id] = { open: false, entries: [{ valor: '', forma: '' }] };
    });
    setPaymentStates(initialPayments);
  }, [leadTurmas]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turmas vinculadas</h3>
      </div>

      <ProfessorDocumentation formData={formData} uploading={uploading} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} handleDeleteFile={handleDeleteFile} ALLOWED_EXT={ALLOWED_EXT} />

      {loadingTurmas ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
      ) : leadTurmas.length > 0 ? (
        leadTurmas.map(({ turma, attendee }: any) => (
          <TurmaCard key={turma.id} turma={turma} attendee={attendee} formData={formData} products={products} payment={getPayment(attendee.id)} handleToggle={(id, checked) => updatePaymentState(id, { open: checked, entries: [{ valor: '', forma: '' }] })} savePayment={savePayment} loadingSave={loadingSave} handleEntryChange={(id, idx, field, val) => {
            const state = getPayment(id);
            const entries = state.entries.map((e, i) => i === idx ? { ...e, [field]: val } : e);
            updatePaymentState(id, { entries });
          }} FORMAS={FORMAS} />
        ))
      ) : (
        <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">Nenhuma turma vinculada.</p>
        </div>
      )}

      <div className="border border-dashed border-blue-100 rounded-2xl p-4 flex items-start gap-3 bg-blue-50/40">
        <Activity size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-600 leading-relaxed">Registre atividades relacionadas a este lead em <strong>Nova Atividade</strong>.</p>
      </div>

      <NewActivityModal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} leadId={leadId} leadName={leadName} onCreated={onActivityCreated} />
    </div>
  );
};
