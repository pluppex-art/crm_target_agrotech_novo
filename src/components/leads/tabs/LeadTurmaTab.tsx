import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Calendar, Clock, MapPin, Plus, Activity, CheckSquare, ChevronDown, Upload, Eye, FileText, Loader2, X as XIcon, QrCode } from 'lucide-react';
import { NewActivityModal } from '../../tasks/NewActivityModal';
import { cn } from '../../../lib/utils';
import type { TurmaAttendee } from '../../../services/turmaService';
import { uploadLeadFile, deleteLeadFile } from '../../../services/leadFilesService';

interface LeadTurmaTabProps {
  leadTurmas: any[];
  loadingTurmas: boolean;
  leadId?: string;
  leadName?: string;
  valorRecebido?: number | null;
  leadValue?: number;
  updateAttendeePayment?: (attendeeId: string, valor_recebido: number | null, forma_pagamento: string) => Promise<void>;
  onActivityCreated?: () => void;
  formData?: any;
  updateFormField?: (updates: any) => void;
  toggleField?: (field: string, value: any) => Promise<void>;
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
}) => {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>({});

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
      const hasPayment = attendee.valor_recebido != null;
      initial[attendee.id] = {
        open: hasPayment,
        entries: hasPayment
          ? [{ valor: attendee.valor_recebido!.toString(), forma: attendee.forma_pagamento ?? '' }]
          : [{ valor: '', forma: '' }],
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

  const handleToggle = async (attendeeId: string, checked: boolean) => {
    if (!checked) {
      updatePaymentState(attendeeId, { open: false, entries: [{ valor: '', forma: '' }] });
      await updateAttendeePayment?.(attendeeId, null, '');
    } else {
      updatePaymentState(attendeeId, { open: true });
    }
  };

  const handleEntryChange = (attendeeId: string, index: number, field: keyof PaymentEntry, value: string) => {
    const state = getPayment(attendeeId);
    const entries = state.entries.map((e, i) => i === index ? { ...e, [field]: value } : e);
    updatePaymentState(attendeeId, { entries });
  };

  const addEntry = (attendeeId: string) => {
    const state = getPayment(attendeeId);
    updatePaymentState(attendeeId, { entries: [...state.entries, { valor: '', forma: '' }] });
  };

  const removeEntry = (attendeeId: string, index: number) => {
    const state = getPayment(attendeeId);
    const entries = state.entries.filter((_, i) => i !== index);
    updatePaymentState(attendeeId, { entries });
  };

  const savePayment = async (attendeeId: string, entries?: PaymentEntry[]) => {
    const state = getPayment(attendeeId);
    const entriesToSave = entries ?? state.entries;
    const total = entriesToSave.reduce((sum, e) => sum + (e.valor ? parseFloat(e.valor) : 0), 0);
    const formas = entriesToSave.filter(e => e.forma).map(e => e.forma).join(', ');
    await updateAttendeePayment?.(attendeeId, total > 0 ? total : null, formas);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Professor Files Upload */}
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
          const valorAReceber = leadValue != null
            ? leadValue - (valorRecebido ?? 0)
            : null;

          return (
            <div key={turma.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              {/* Turma header */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{turma.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{turma.professor_name || 'Sem professor'}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                  {attendee.status}
                </span>
              </div>

              {/* Date/time/location */}
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

              {/* Valor a Receber — sempre visível baseado no pipeline */}
              {valorAReceber != null && (
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Valor do Curso</span>
                    <span className="font-semibold text-slate-600">
                      R$ {leadValue!.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {(valorRecebido ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 uppercase font-bold text-emerald-600">✓ Ganho Caixa</span>
                      <span className="font-semibold text-emerald-600">
                        R$ {Number(valorRecebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="font-bold text-slate-600">Valor Competência (a Receber)</span>
                    <span className={cn('font-bold', valorAReceber <= 0 ? 'text-emerald-600' : 'text-orange-600')}>
                      R$ {valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Pagamento recebido nesta turma */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={payment.open}
                        onChange={(e) => handleToggle(attendee.id, e.target.checked)}
                        className="sr-only"
                      />
                      <div className={cn(
                        'w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center',
                        payment.open ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-200'
                      )}>
                        {payment.open && <CheckSquare size={12} className="text-white" />}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-700">Pagamento recebido?</span>
                  </label>

                  {payment.open && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addEntry(attendee.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <Plus size={12} />
                        Adicionar
                      </button>
                      <button
                        onClick={() => savePayment(attendee.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                        disabled={payment.entries.every(e => !e.valor.trim())}
                      >
                        <CheckSquare size={12} />
                        Salvar Pagamento
                      </button>
                    </div>
                  )}
                </div>

                {payment.open && (
                  <div className="space-y-2">
                    {payment.entries.map((entry, index) => (
                      <div key={index} className="flex items-end gap-2">  
                        <div className="flex flex-col gap-1 flex-1">
                          {index === 0 && (
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor (R$)</label>
                          )}
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.valor}
                            onChange={(e) => handleEntryChange(attendee.id, index, 'valor', e.target.value)}
                            onBlur={() => savePayment(attendee.id)}
                            placeholder="0,00"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-medium shadow-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          {index === 0 && (
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forma</label>
                          )}
                          <div className="relative">
                            <select
                              value={entry.forma}
                              onChange={(e) => handleEntryChange(attendee.id, index, 'forma', e.target.value)}
                              onBlur={() => savePayment(attendee.id)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none text-sm font-medium shadow-sm cursor-pointer"
                            >
                              <option value="">Selecione...</option>
                              {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        {payment.entries.length > 1 && (
                          <button
                            onClick={() => removeEntry(attendee.id, index)}
                            className="mb-0.5 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XIcon size={14} />
                          </button>
                        )}
                      </div>
                    ))}
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

      {/* Activity hint */}
      <div className="border border-dashed border-blue-100 rounded-2xl p-4 flex items-start gap-3 bg-blue-50/40">
        <Activity size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-600 leading-relaxed">
          Registre atividades relacionadas a este lead — ligações, visitas, reuniões — clicando em <strong>Nova Atividade</strong>. Elas também aparecem na página de Tarefas e no Calendário.
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
