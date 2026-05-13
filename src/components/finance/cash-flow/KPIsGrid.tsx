import React from 'react';
import { TrendingUp, TrendingDown, Clock, Users, Scale } from 'lucide-react';
import { fmt, cn } from '../../../lib/utils';

interface CashKpiCardProps {
  icon: any;
  label: string;
  display: string;
  hint?: string;
  color: string;
}

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
};

const CashKpiCard: React.FC<CashKpiCardProps> = ({ icon: Icon, label, display, hint, color }) => (
  <div className={cn('rounded-2xl border p-4 flex flex-col gap-1', COLOR_MAP[color] ?? COLOR_MAP.blue)}>
    <div className="flex items-center gap-2">
      <Icon size={15} />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
    </div>
    <p className="text-xl font-black tracking-tight">{display}</p>
    {hint && <p className="text-[10px] font-bold opacity-50 leading-tight uppercase tracking-tighter">{hint}</p>}
  </div>
);

export const KPIsGrid: React.FC<{ kpis: any }> = ({ kpis }) => {
  if (!kpis) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <CashKpiCard icon={TrendingUp} label="Entradas Pagas" display={`R$ ${fmt(kpis.receita_total)}`} hint="Receita recebida no período" color="emerald" />
      <CashKpiCard icon={TrendingDown} label="Saídas Pagas" display={`R$ ${fmt(kpis.despesa_total)}`} hint="Despesas pagas no período" color="rose" />
      <CashKpiCard icon={Clock} label="A Receber" display={`R$ ${fmt(kpis.contas_receber)}`} hint="Receitas pendentes (todos os períodos)" color="blue" />
      <CashKpiCard icon={Clock} label="A Pagar" display={`R$ ${fmt(kpis.contas_pagar)}`} hint="Despesas pendentes (todos os períodos)" color="amber" />
      <CashKpiCard icon={Users} label="Alunos Ganhos" display={String(kpis.alunos_ganhos)} hint="Leads fechados no período" color="violet" />
      <CashKpiCard icon={Scale} label="Saldo" display={`R$ ${fmt(Math.abs(kpis.lucro_liquido))}`}
        hint={kpis.lucro_liquido >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
        color={kpis.lucro_liquido >= 0 ? 'emerald' : 'rose'} />
    </div>
  );
};
