import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Calendar, Clock, MapPin, Plus, Activity, CheckSquare, ChevronDown, Upload, Eye, FileText, Loader2, X as XIcon, QrCode } from 'lucide-react';
import { NewActivityModal } from '../../tasks/NewActivityModal';
import { cn } from '../../../lib/utils';
import type { TurmaAttendee } from '../../../services/turmaService';
import { uploadLeadFile, deleteLeadFile } from '../../../services/leadFilesService';
import { financialCalculator } from '../../../services/financialCalculator';

interface LeadTurmaTabProps {
  leadTurmas: any[];
  loadingTurmas: boolean;
  leadId?: string;
  leadName?: string;
  valorRecebido?: number | null;
  leadValue?: number;
  updateAttendeePayment?: (attendeeId: string, valor_recebido: number, forma_pagamento: string) => Promise<void>;
  onActivityCreated?: () => void;
  formData?: any;
  updateFormField?: (updates: any) => void;
  toggleField?: (field: string, value: any) => Promise<void>;
  products?: any[];
}

interface PaymentEntry {
  valor: string;
  forma: string;
}

interface PaymentState {
  open: boolean;
  entries: PaymentEntry[];
}

const FORMAS = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto Bancário', 'Dinheiro', 'Transferência Bancária', 'Cheque'];

export const LeadTurmaTab: React.FC<LeadTurmaTabProps> = ({
  leadTurmas,
  loadingTurmas,
  leadId,
  leadName,
  valorRecebido,
  leadValue,
  updateAttendeePayment,
  onActivityCreated,
  formData,
  updateFormField,
  toggleField,
  products = [],
}) => {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>({});
  const [loadingSave, setLoadingSave] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const ALLOWED_EXT = '.jpg,.jpeg,.png,.pdf';

  const handleFileUpload = async (file: File) => {
    if (!leadId) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Formato inválido. Use .JPEG, .PNG ou .PDF');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadLeadFile(leadId, 'payment_proof', file);
      if (url) {
        updateFormField?.({ professor_proof_url: url });
        await toggleField?.('professor_proof_url', url);
      } else {
        alert('Falha ao enviar arquivo.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async () => {
    const url = formData?.professor_proof_url;
    if (!url) return;
    if (!confirm('Remover este arquivo?')) return;
    await deleteLeadFile(url);
    updateFormField?.({ professor_proof_url: null });
    await toggleField?.('professor_proof_url', null);
  };

  useEffect(() => {
    const initial: Record<string, PaymentState> = {};
    leadTurmas.forEach(({ attendee }: { attendee: TurmaAttendee }) => {
      initial[attendee.id] = {
        open: false,
        entries: [{ valor: '', forma: '' }],
      };
    });
    setPaymentStates(initial);
  }, [leadTurmas]);

  const getPayment = (attendeeId: string): PaymentState =>
    paymentStates[attendeeId] ?? { open: false, entries: [{ valor: '', forma: '' }] };

  const updatePaymentState = (attendeeId: string, updates: Partial<PaymentState>) =>
    setPaymentStates(prev => ({
      ...prev,
      [attendeeId]: { ...getPayment(attendeeId), ...updates },
    }));

  const handleToggle = (attendeeId: string, checked: boolean) => {
    updatePaymentState(attendeeId, { open: checked, entries: [{ valor: '', forma: '' }] });
  };

  const handleEntryChange = (attendeeId: string, index: number, field: keyof PaymentEntry, value: string) => {
    const state = getPayment(attendeeId);
    const entries = state.entries.map((e, i) => i === index ? { ...e, [field]: value } : e);
    updatePaymentState(attendeeId, { entries });
  };

  const savePayment = async (attendeeId: string) => {
    const state = getPayment(attendeeId);
    const entry = state.entries[0];
    const val = parseFloat(entry.valor);
    
    if (isNaN(val) || val <= 0) {
      alert('Por favor, insira um valor válido maior que zero.');
      return;
    }
    
    if (!entry.forma) {
      alert('Por favor, selecione a forma de pagamento.');
      return;
    }

    setLoadingSave(attendeeId);
    try {
      await updateAttendeePayment?.(attendeeId, val, entry.forma);
      updatePaymentState(attendeeId, { open: false, entries: [{ valor: '', forma: '' }] });
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Erro ao salvar pagamento.');
    } finally {
      setLoadingSave(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turmas vinculadas</h3>
        <button
          onClick={() => setIsActivityModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus size={14} />
          Nova Atividade
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <FileText size={12} /> Documentação do Professor
        </p>
        
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <QrCode size={13} className="text-slate-400" /> Comprovante de Pagamento
              {formData?.professor_proof_url && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                  <CheckSquare size={9} /> Enviado
                </span>
              )}
            </p>
            {formData?.professor_proof_url && (
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={formData.professor_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-bold truncate max-w-[180px]"
                >
                  <Eye size={10} /> Ver comprovante
                </a>
                <button
                  type="button"
                  onClick={handleDeleteFile}
                  className="p-0.5 text-red-400 hover:text-red-600 transition-colors"
                >
                  <XIcon size={12} />
                </button>
              </div>
            )}
          </div>
          
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXT}
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm",
                formData?.professor_proof_url
                  ? "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              )}
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? 'Enviando...' : formData?.professor_proof_url ? 'Substituir' : 'Anexar Comprovante'}
            </button>
          </div>
        </div>
      </div>

      {loadingTurmas ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : leadTurmas.length > 0 ? (
        leadTurmas.map(({ turma, attendee }: any) => {
          const payment = getPayment(attendee.id);
          const valorAReceber = financialCalculator.getPendingAmount(formData, products);
          const hasSavedPayment = attendee.valor_recebido && attendee.valor_recebido > 0;

          return (
            <div key={turma.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{turma.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{turma.professor_name || 'Sem professor'}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                  {attendee.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-emerald-500 shrink-0" />
                  {turma.date
                    ? new Date(turma.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
                    : 'Data não definida'}
                  <Clock size={12} className="text-emerald-500 ml-1 shrink-0" />
                  {turma.time || '--:--'}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-emerald-500 shrink-0" />
                  {turma.location || 'Sem localização'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamentos Confirmados</p>
                {hasSavedPayment ? (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-700">R$ {Number(attendee.valor_recebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-emerald-600 opacity-80">{attendee.forma_pagamento || 'Diversas formas'}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-white px-2 py-1 rounded-full border border-emerald-100">
                      <CheckSquare size={10} />
                      REGISTRADO
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Nenhum pagamento registrado nesta turma.</p>
                )}
                
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-slate-500">Saldo Pendente (Total)</span>
                  <span className={cn('font-bold', (valorAReceber ?? 0) <= 0 ? 'text-emerald-600' : 'text-orange-600')}>
                    R$ {(valorAReceber ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={payment.open}
                        onChange={(e) => handleToggle(attendee.id, e.target.checked)}
                        className="sr-only"
                      />
                      <div className={cn(
                        'w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center',
                        payment.open ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-200 group-hover:border-emerald-200'
                      )}>
                        {payment.open && <CheckSquare size={12} className="text-white" />}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-700">Registrar novo pagamento?</span>
                  </label>

                  {payment.open && (
                    <button
                      onClick={() => savePayment(attendee.id)}
                      disabled={loadingSave === attendee.id || !payment.entries[0].valor || !payment.entries[0].forma}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
                    >
                      {loadingSave === attendee.id ? <Loader2 size={12} className="animate-spin" /> : <CheckSquare size={12} />}
                      Salvar Manualmente
                    </button>
                  )}
                </div>

                {payment.open && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payment.entries[0].valor}
                        onChange={(e) => handleEntryChange(attendee.id, 0, 'valor', e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma</label>
                      <div className="relative">
                        <select
                          value={payment.entries[0].forma}
                          onChange={(e) => handleEntryChange(attendee.id, 0, 'forma', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none text-sm font-bold shadow-sm cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Este lead não está matriculado em nenhuma turma.</p>
        </div>
      )}

      <div className="border border-dashed border-blue-100 rounded-2xl p-4 flex items-start gap-3 bg-blue-50/40">
        <Activity size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-600 leading-relaxed">
          Registre atividades relacionadas a este lead clicando em <strong>Nova Atividade</strong>.
        </p>
      </div>

      <NewActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        leadId={leadId}
        leadName={leadName}
        onCreated={onActivityCreated}
      />
    </div>
  );
};
