import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, CheckSquare, Plus, ChevronDown, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Turma, TurmaAttendee } from '../../../services/turmaService';
import type { Lead } from '../../../types/leads';

interface LeadFinanceTabProps {
  leadTurmas: { turma: Turma; attendee: TurmaAttendee }[];
  loadingTurmas: boolean;
  leadId?: string;
  leadName?: string;
  leadValue?: number;
  leadValorRecebido?: number | null;
  updateAttendeePayment?: (attendeeId: string, valor_recebido: number | null, forma_pagamento: string) => Promise<void>;
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

export const LeadFinanceTab: React.FC<LeadFinanceTabProps> = ({
  leadTurmas,
  loadingTurmas,
  leadId,
  leadName,
  leadValue,
  leadValorRecebido,
  updateAttendeePayment,
}) => {
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>({});

  // Cálculos agregados
  const totals = useMemo(() => {
    let totalVendas = (leadValue || 0);
    let totalRecebido = (leadValorRecebido || 0);
    
    leadTurmas.forEach(({ attendee }) => {
      totalVendas += Number(attendee.vendas) || 0;
      totalRecebido += Number(attendee.valor_recebido) || 0;
    });

    const competencia = Math.max(0, totalVendas - totalRecebido);
    
    return {
      totalVendas,
      totalRecebido: Math.round(totalRecebido * 100) / 100,
      competencia: Math.round(competencia * 100) / 100,
    };
  }, [leadTurmas, leadValue, leadValorRecebido]);

  useEffect(() => {
    const initial: Record<string, PaymentState> = {};
    leadTurmas.forEach(({ attendee }) => {
      const hasPayment = attendee.valor_recebido != null && attendee.valor_recebido > 0;
      initial[attendee.id] = {
        open: hasPayment,
        entries: hasPayment
          ? [{ valor: attendee.valor_recebido!.toString(), forma: attendee.forma_pagamento ?? '' }]
          : [{ valor: '', forma: '' }],
      };
    });
    setPaymentStates(initial);
  }, [leadTurmas, leadValorRecebido]);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value);
  };

  if (loadingTurmas) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Ganho Caixa e Competência
        </h3>
      </div>

      {/* Totais Agregados - igual PipelineHeader */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border border-slate-100">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Vendas</p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            R$ {formatCurrency(totals.totalVendas)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Caixa (Recebido)</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            R$ {formatCurrency(totals.totalRecebido)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Competência</p>
          <p className="text-2xl font-black text-blue-700 mt-1">
            R$ {formatCurrency(totals.competencia)}
          </p>
        </div>
      </div>

      {/* Breakdown por Turma */}
      {leadTurmas.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1 border-b border-slate-200 pb-1">
            Por Turma
          </h4>
          {leadTurmas.map(({ turma, attendee }) => {
            const payment = getPayment(attendee.id);
            const vendasTurma = Number(attendee.vendas) || 0;
            const recebidoTurma = Number(attendee.valor_recebido) || 0;
            const competenciaTurma = Math.max(0, vendasTurma - recebidoTurma);

            return (
              <div key={turma.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{turma.name}</h5>
                    <p className="text-xs text-slate-500">{turma.professor_name || 'Sem professor'}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    attendee.status === 'confirmado' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {attendee.status}
                  </span>
                </div>

                {/* Cálculo por turma */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Vendas</span>
                    <span className="font-semibold">R$ {formatCurrency(vendasTurma)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Recebido</span>
                    <span className="font-semibold text-emerald-600">R$ {formatCurrency(recebidoTurma)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Competência</span>
                    <span className={cn(
                      'font-semibold', 
                      competenciaTurma > 0 ? 'text-blue-600' : 'text-emerald-500 line-through'
                    )}>
                      R$ {formatCurrency(competenciaTurma)}
                    </span>
                  </div>
                </div>

                {/* Pagamento editável */}
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
                      <span className="text-sm font-bold text-slate-700">Pagamento nesta turma</span>
                    </label>
                    {payment.open && (
                      <button
                        onClick={() => addEntry(attendee.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                      >
                        <Plus size={12} />
                        Adicionar
                      </button>
                    )}
                  </div>

                  {payment.open && (
                    <div className="space-y-2">
                      {payment.entries.map((entry, index) => (
                        <div key={index} className="flex items-end gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.valor}
                            onChange={(e) => handleEntryChange(attendee.id, index, 'valor', e.target.value)}
                            onBlur={() => savePayment(attendee.id)}
                            placeholder="0,00"
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium shadow-sm"
                          />
                          <div className="relative flex-1">
                            <select
                              value={entry.forma}
                              onChange={(e) => handleEntryChange(attendee.id, index, 'forma', e.target.value)}
                              onBlur={() => savePayment(attendee.id)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none text-sm font-medium shadow-sm"
                            >
                              <option value="">Forma...</option>
                              {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                          {payment.entries.length > 1 && (
                            <button
                              onClick={() => removeEntry(attendee.id, index)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30 text-emerald-400" />
          <p className="text-lg font-medium text-slate-500 mb-1">Sem dados financeiros</p>
          <p className="text-sm">Este lead não possui turmas ou vendas registradas.</p>
        </div>
      )}
    </div>
  );
};

