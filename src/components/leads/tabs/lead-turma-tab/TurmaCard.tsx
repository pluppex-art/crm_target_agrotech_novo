import React from 'react';
import { Calendar, Clock, MapPin, CheckSquare, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { financialCalculator } from '../../../../services/financialCalculator';

interface TurmaCardProps {
  turma: any;
  attendee: any;
  formData: any;
  products: any[];
  payment: any;
  handleToggle: (id: string, checked: boolean) => void;
  savePayment: (id: string) => void;
  loadingSave: string | null;
  handleEntryChange: (id: string, index: number, field: string, value: string) => void;
  FORMAS: string[];
}

export const TurmaCard: React.FC<TurmaCardProps> = ({
  turma,
  attendee,
  formData,
  products,
  payment,
  handleToggle,
  savePayment,
  loadingSave,
  handleEntryChange,
  FORMAS
}) => {
  const leadForCalc = {
    ...formData,
    valor_recebido: attendee.valor_recebido ?? 0,
    taxa_matricula_recebido: attendee.taxa_matricula_recebido ?? formData?.taxa_matricula_recebido ?? null,
  };
  const valorPago = financialCalculator.getPaidAmount(leadForCalc, products);
  const valorAReceber = financialCalculator.getPendingAmount(leadForCalc, products);
  const hasSavedPayment = (attendee.valor_recebido ?? 0) > 0 || (attendee.taxa_matricula_recebido ?? 0) > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{turma.name}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{turma.professor_name || 'Sem professor'}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
          {attendee.status}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-emerald-500 shrink-0" />
          {turma.date
            ? new Date(turma.date.replace(/-/g, '\/')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : 'Data não definida'}
          <Clock size={12} className="text-emerald-500 ml-1 shrink-0" />
          {turma.time || '--:--'}
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={12} className="text-emerald-500 shrink-0" />
          {turma.location || 'Sem localização'}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo Financeiro</p>

        {(attendee.valor_recebido ?? 0) > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <CheckSquare size={10} className="text-emerald-500" />
              Pago na turma
            </span>
            <span className="font-bold text-emerald-600">
              R$ {Number(attendee.valor_recebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {(attendee.taxa_matricula_recebido ?? 0) > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <CheckSquare size={10} className="text-emerald-500" />
              Taxa de matrícula
            </span>
            <span className="font-bold text-emerald-600">
              R$ {Number(attendee.taxa_matricula_recebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-1">
          <span className="font-bold text-slate-600 dark:text-slate-400">Total Pago</span>
          <span className="font-bold text-emerald-700">
            R$ {valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400">A Receber</span>
          <span className={cn('font-bold', valorAReceber <= 0 ? 'text-emerald-600' : 'text-orange-600')}>
            R$ {valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {!hasSavedPayment && (
          <p className="text-[10px] text-slate-400 italic">Nenhum pagamento registrado nesta turma.</p>
        )}
      </div>

      {(valorAReceber ?? 0) > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
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
                  payment.open ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 group-hover:border-emerald-200'
                )}>
                  {payment.open && <CheckSquare size={12} className="text-white" />}
                </div>
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Registrar novo pagamento?</span>
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
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payment.entries[0].valor}
                  onChange={(e) => handleEntryChange(attendee.id, 0, 'valor', e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma</label>
                <div className="relative">
                  <select
                    value={payment.entries[0].forma}
                    onChange={(e) => handleEntryChange(attendee.id, 0, 'forma', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none text-sm font-bold shadow-sm cursor-pointer"
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
      )}
    </div>
  );
};
