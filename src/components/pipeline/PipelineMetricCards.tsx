import React from 'react';
import { Trophy, UserCheck } from 'lucide-react';
import { financialCalculator } from '../../services/financialCalculator';

interface PipelineMetricCardsProps {
  pago: number;
  pendente: number;
}

export const PipelineMetricCards: React.FC<PipelineMetricCardsProps> = ({ pago, pendente }) => {
  return (
    <div className="flex items-center gap-2">
      {/* PAGO */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-500/30 rounded-xl shadow-sm">
        <Trophy size={16} className="text-emerald-600 dark:text-emerald-400" />
        <div className="flex flex-col">
          <p className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-wider leading-none">Pago</p>
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 leading-none mt-0.5">
            {financialCalculator.formatCurrency(pago)}
          </p>
        </div>
      </div>

      {/* PENDENTE */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-500/30 rounded-xl shadow-sm">
        <UserCheck size={16} className="text-blue-600 dark:text-blue-400" />
        <div className="flex flex-col">
          <p className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-wider leading-none">Pendente</p>
          <p className="text-sm font-black text-blue-700 dark:text-blue-300 leading-none mt-0.5">
            {financialCalculator.formatCurrency(pendente)}
          </p>
        </div>
      </div>
    </div>
  );
};
