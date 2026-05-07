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
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
        <Trophy size={16} className="text-emerald-600" />
        <div className="flex flex-col">
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider leading-none">Pago</p>
          <p className="text-sm font-black text-emerald-700 leading-none mt-0.5">
            {financialCalculator.formatCurrency(pago)}
          </p>
        </div>
      </div>

      {/* PENDENTE */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl shadow-sm">
        <UserCheck size={16} className="text-blue-600" />
        <div className="flex flex-col">
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider leading-none">Pendente</p>
          <p className="text-sm font-black text-blue-700 leading-none mt-0.5">
            {financialCalculator.formatCurrency(pendente)}
          </p>
        </div>
      </div>
    </div>
  );
};
