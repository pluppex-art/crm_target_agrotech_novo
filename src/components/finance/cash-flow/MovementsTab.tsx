import React from 'react';
import { TrendingDown } from 'lucide-react';
import { fmt } from '../../../lib/utils';
import { TransactionRow } from './TransactionRow';

function formatDate(iso: string) {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const date = new Date(datePart + 'T12:00:00');
  if (isNaN(date.getTime())) return 'Data Inválida';
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

export const MovementsTab: React.FC<{ sortedDates: string[]; grouped: Record<string, any[]> }> = ({ sortedDates, grouped }) => {
  return (
    <div className="min-h-[200px]">
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <TrendingDown size={32} className="mb-2 opacity-30" />
          <p className="text-sm">Nenhuma despesa registrada.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center justify-between px-6 py-2 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{formatDate(date)}</span>
                <span className="text-[10px] font-black text-rose-600 uppercase">
                  Saídas: - R$ {fmt(grouped[date].filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((s, t) => s + Number(t.amount), 0))}
                </span>
              </div>
              {grouped[date].map(t => <TransactionRow key={t.id} transaction={t} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
