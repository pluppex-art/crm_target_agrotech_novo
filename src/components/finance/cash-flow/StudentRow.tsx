import React from 'react';
import { GraduationCap } from 'lucide-react';
import { fmt, cn } from '../../../lib/utils';

function formatDate(iso: string) {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const date = new Date(datePart + 'T12:00:00');
  if (isNaN(date.getTime())) return 'Data Inválida';
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

export const StudentRow: React.FC<{ tx: any }> = ({ tx }) => {
  const isPaid = tx.status === 'PAID';
  const isOverdue = tx.status === 'OVERDUE';
  const leadName = tx.leads?.name ?? tx.description.replace('Receita Automática - Lead: ', '');
  const productName = tx.turmas?.name || tx.leads?.product || 'Produto não identificado';
  const totalValue = tx.leads?.value ? Number(tx.leads.value) : Number(tx.amount);
  const paidValue = isPaid ? Number(tx.amount) : 0;

  return (
    <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black',
        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600 border border-amber-200'
      )}>
        {leadName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate tracking-tight">{leadName}</p>
          <span className={cn(
            "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border",
            tx.cost_center === 'cursos' ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
          )}>{productName}</span>
        </div>
        <p className="text-[11px] text-slate-400 font-bold mt-0.5">
          {isPaid ? `Recebido em ${tx.payment_date ? formatDate(tx.payment_date) : '—'}` : isOverdue ? `Vencido em ${tx.due_date ? formatDate(tx.due_date) : '—'}` : tx.due_date ? `Vence em ${formatDate(tx.due_date)}` : 'Pendente'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-sm font-black tabular-nums', isPaid ? 'text-emerald-600' : isOverdue ? 'text-rose-500' : 'text-amber-600')}>R$ {fmt(Number(tx.amount))}</p>
        {!isPaid && totalValue > 0 && <p className="text-[10px] text-slate-400 font-bold">{paidValue > 0 ? `R$ ${fmt(paidValue)} de ` : ''}R$ {fmt(totalValue)}</p>}
      </div>
    </div>
  );
};
