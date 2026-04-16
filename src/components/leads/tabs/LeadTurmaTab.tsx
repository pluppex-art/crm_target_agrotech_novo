import React, { useState, useEffect } from 'react';
import { GraduationCap, Calendar, Clock, MapPin, Plus, Activity, CheckSquare, ChevronDown } from 'lucide-react';
import { NewActivityModal } from '../../tasks/NewActivityModal';
import { cn } from '../../../lib/utils';
import type { TurmaAttendee } from '../../../services/turmaService';

interface LeadTurmaTabProps {
  leadTurmas: any[];
  loadingTurmas: boolean;
  leadId?: string;
  leadName?: string;
  valorRecebido?: number | null;
  leadValue?: number;
  updateAttendeePayment?: (attendeeId: string, valor_recebido: number | null, forma_pagamento: string) => Promise<void>;
  onActivityCreated?: () => void;
}

interface PaymentState {
  open: boolean;
  valor: string;
  forma: string;
}

export const LeadTurmaTab: React.FC<LeadTurmaTabProps> = ({
  leadTurmas,
  loadingTurmas,
  leadId,
  leadName,
  valorRecebido,
  leadValue,
  updateAttendeePayment,
  onActivityCreated,
}) => {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>({});

  // Initialize payment states when turmas load
  useEffect(() => {
    const initial: Record<string, PaymentState> = {};
    leadTurmas.forEach(({ attendee }: { attendee: TurmaAttendee }) => {
      initial[attendee.id] = {
        open: attendee.valor_recebido != null,
        valor: attendee.valor_recebido?.toString() ?? '',
        forma: attendee.forma_pagamento ?? '',
      };
    });
    setPaymentStates(initial);
  }, [leadTurmas]);

  const getPayment = (attendeeId: string): PaymentState =>
    paymentStates[attendeeId] ?? { open: false, valor: '', forma: '' };

  const setPayment = (attendeeId: string, updates: Partial<PaymentState>) =>
    setPaymentStates(prev => ({
      ...prev,
      [attendeeId]: { ...getPayment(attendeeId), ...updates },
    }));

  const handleTogglePayment = async (attendeeId: string, checked: boolean) => {
    setPayment(attendeeId, { open: checked });
    if (!checked) {
      setPayment(attendeeId, { open: false, valor: '', forma: '' });
      await updateAttendeePayment?.(attendeeId, null, '');
    }
  };

  const handleSavePayment = async (attendeeId: string) => {
    const state = getPayment(attendeeId);
    const valor = state.valor ? parseFloat(state.valor) : null;
    await updateAttendeePayment?.(attendeeId, valor, state.forma);
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

      {loadingTurmas ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : leadTurmas.length > 0 ? (
        leadTurmas.map(({ turma, attendee }: any) => {
          const payment = getPayment(attendee.id);
          const valorAReceber = payment.open && leadValue != null
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

              {/* Payment toggle for this turma */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer w-fit">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={payment.open}
                      onChange={(e) => handleTogglePayment(attendee.id, e.target.checked)}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center",
                      payment.open ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-200"
                    )}>
                      {payment.open && <CheckSquare size={12} className="text-white" />}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-700">Pagamento recebido?</span>
                </label>

                <div className={cn(
                  "grid grid-cols-2 gap-3 transition-all duration-300",
                  payment.open ? "opacity-100 max-h-[200px]" : "opacity-0 max-h-0 overflow-hidden"
                )}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payment.valor}
                      onChange={(e) => setPayment(attendee.id, { valor: e.target.value })}
                      onBlur={() => handleSavePayment(attendee.id)}
                      placeholder="0,00"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-medium shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forma</label>
                    <div className="relative">
                      <select
                        value={payment.forma}
                        onChange={(e) => {
                          setPayment(attendee.id, { forma: e.target.value });
                        }}
                        onBlur={() => handleSavePayment(attendee.id)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none text-sm font-medium shadow-sm cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        <option value="PIX">PIX</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Boleto Bancário">Boleto Bancário</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Transferência Bancária">Transferência Bancária</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Valor a Receber — only visible when payment toggle is ON */}
                {payment.open && leadValue != null && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Valor do Curso</span>
                      <span className="font-semibold text-slate-600">
                        R$ {leadValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {(valorRecebido ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">− Valor Recebido</span>
                        <span className="font-semibold text-slate-600">
                          R$ {Number(valorRecebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="font-bold text-slate-600">Valor a Receber</span>
                      <span className={cn(
                        "font-bold",
                        (valorAReceber ?? 0) <= 0 ? "text-emerald-600" : "text-orange-600"
                      )}>
                        R$ {(valorAReceber ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
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
