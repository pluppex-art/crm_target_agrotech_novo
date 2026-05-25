import React from 'react';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { fmt, cn } from '../../../lib/utils';

export const TransactionRow: React.FC<{ transaction: any }> = ({ transaction: t }) => {
  const isPaid = t.status === 'PAID';
  const isIncome = t.type === 'INCOME';
  const isOverdue = t.status === 'OVERDUE';
  const statusLabel = isPaid ? (isIncome ? 'Recebida' : 'Paga') : isOverdue ? 'Vencida' : (isIncome ? 'A Receber' : 'A Pagar');
  const ORIGIN_LABEL: Record<string, string> = { COMMISSION: 'Comissão', CLASS: 'Turma', PARTNER: 'Parceria', REFUND: 'Reembolso', MANUAL: 'Manual' };
  const displayDescription = t.origin_type === 'CLASS' && t.turmas ? `Turma: ${t.turmas.name}` : t.description;

  return (
    <div className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', isIncome ? (isPaid ? 'bg-emerald-100' : 'bg-emerald-50 border border-emerald-200') : (isPaid ? 'bg-rose-100' : 'bg-rose-50 border border-rose-200'))}>
        {isIncome ? <TrendingUp size={14} className={isPaid ? 'text-emerald-600' : 'text-emerald-400'} /> : <TrendingDown size={14} className={isPaid ? 'text-rose-600' : 'text-rose-400'} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold truncate tracking-tight', isPaid ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400')}>{displayDescription}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('text-[11px] font-black uppercase tracking-tighter', isPaid ? 'text-slate-400' : isOverdue ? 'text-rose-500' : 'text-amber-500')}>{statusLabel}</span>
          {t.origin_type && ORIGIN_LABEL[t.origin_type] && (
            <><ChevronRight size={10} className="text-slate-300" /><span className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">{ORIGIN_LABEL[t.origin_type]}</span></>
          )}
        </div>
      </div>
      <span className={cn('text-sm font-black shrink-0 tabular-nums', isIncome ? 'text-emerald-600' : 'text-rose-600', !isPaid && 'opacity-50')}>
        {isIncome ? '+' : '−'} R$ {fmt(Number(t.amount))}
      </span>
    </div>
  );
};
