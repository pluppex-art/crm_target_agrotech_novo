import React from 'react';
import { Phone, Target } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SellerCallData {
  user_id: string;
  user_name: string;
  count: number;
  goal: number;
}

interface CallsSemaphoreProps {
  data: SellerCallData[];
  isAdmin: boolean;
  currentUserId?: string | null;
}

function getColor(pct: number): { bar: string; text: string; bg: string; border: string; label: string } {
  if (pct >= 100) return { bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Meta atingida!' };
  if (pct >= 80)  return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'No alvo' };
  if (pct >= 50)  return { bar: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Em progresso' };
  return             { bar: 'bg-red-400',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Abaixo da meta' };
}

export function CallsSemaphore({ data, isAdmin, currentUserId }: CallsSemaphoreProps) {
  const visible = isAdmin ? data : data.filter(d => d.user_id === currentUserId);

  if (visible.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-800">Ligações do Dia</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-slate-300">
          <Target className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-xs font-medium">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 bg-blue-50 rounded-lg">
          <Phone className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="font-bold text-slate-800">Ligações do Dia</h3>
        <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta diária</span>
      </div>

      <div className="space-y-4">
        {visible.map(seller => {
          const pct = seller.goal > 0 ? Math.min((seller.count / seller.goal) * 100, 100) : 0;
          const cfg = getColor(pct);
          const initials = seller.user_name.substring(0, 2).toUpperCase();

          return (
            <div key={seller.user_id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border", cfg.bg, cfg.border, cfg.text)}>
                    {initials}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{seller.user_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-black tabular-nums", cfg.text)}>
                    {seller.count}/{seller.goal}
                  </span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.bg, cfg.border, cfg.text)}>
                    {cfg.label}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", cfg.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 flex-wrap">
        {[
          { label: 'Abaixo', dot: 'bg-red-400' },
          { label: 'Em progresso', dot: 'bg-amber-400' },
          { label: 'No alvo', dot: 'bg-emerald-500' },
          { label: 'Meta atingida', dot: 'bg-yellow-400' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span className={cn("w-2 h-2 rounded-full", item.dot)} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
