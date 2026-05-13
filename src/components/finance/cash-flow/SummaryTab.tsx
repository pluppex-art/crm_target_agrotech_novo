import React from 'react';
import { Users, Clock, CheckCircle2 } from 'lucide-react';
import { fmt } from '../../../lib/utils';

export const SummaryTab: React.FC<{ kpis: any; pipelinePendingCount: number; pipelinePaidCount: number }> = ({ kpis, pipelinePendingCount, pipelinePaidCount }) => {
  return (
    <div className="divide-y divide-slate-100">
      <div className="p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Saúde Financeira</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-3">Composição de Receita</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-medium">Alunos e Matrículas</span>
                <span className="text-sm font-bold text-emerald-600">R$ {fmt(kpis?.receita_total || 0)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Total Geral</span>
                <span className="text-base font-black text-emerald-700">R$ {fmt(kpis?.receita_total || 0)}</span>
              </div>
            </div>
          </div>
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-3">Estatísticas do Período</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-6 h-6 rounded bg-violet-100 flex items-center justify-center text-violet-600"><Users size={12} /></div>
                <span>{kpis?.alunos_ganhos} novos alunos matriculados</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-600"><Clock size={12} /></div>
                <span>{pipelinePendingCount} pagamentos a receber</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 size={12} /></div>
                <span>{pipelinePaidCount} pagamentos confirmados</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
