import React from 'react';
import { Loader2, Download, Plus, Trophy, UserCheck, CalendarRange } from 'lucide-react';

import { PipelineSelect } from './PipelineSelect';
import { cn } from '../../lib/utils';
import { financialCalculator } from '../../services/financialCalculator';

interface PipelineHeaderProps {
  caixaTotalValue: number;
  competenciaTotalValue: number;
  leadsCount: number;
  currentPipelineId: string | null;
  pipelines: any[];
  onPipelineChange: (id: string) => void;
  fetchLeads: (pipelineId: string) => void;
  isLoading: boolean;
  hasPermissionCreate: boolean;
  onNewLeadClick: () => void;
  startDate: string;
  endDate: string;
  onFilterClick: () => void;
}


export const PipelineHeader: React.FC<PipelineHeaderProps> = ({
  caixaTotalValue,
  competenciaTotalValue,
  leadsCount,
  currentPipelineId,
  pipelines,
  onPipelineChange,
  fetchLeads,
  isLoading,
  hasPermissionCreate,
  onNewLeadClick,
  startDate,
  endDate,
  onFilterClick,
}) => {

  const filterLabel = React.useMemo(() => {
    const s = new Date(startDate + 'T12:00:00');
    const e = new Date(endDate + 'T12:00:00');
    
    if (s.getDate() === 1 && e.getDate() === new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate() && s.getMonth() === e.getMonth()) {
      return s.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    
    return `${s.toLocaleDateString('pt-BR')} - ${e.toLocaleDateString('pt-BR')}`;
  }, [startDate, endDate]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Title & Pipeline Selector */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Pipeline
            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              {leadsCount}
            </span>
          </h1>
          <PipelineSelect
            pipelines={pipelines}
            currentPipelineId={currentPipelineId || ''}
            onPipelineChange={onPipelineChange}
            className="w-48 !py-1 !min-h-[32px] !text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* Date Filter Button */}
        <button
          onClick={onFilterClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all group shadow-sm"
        >
          <CalendarRange className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
          <span className="capitalize text-xs">{filterLabel}</span>
        </button>

        {/* Valores */}
        <div className="flex items-center gap-2">
          {/* Caixa */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
            <Trophy size={16} className="text-emerald-600" />
            <div className="flex flex-col">
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider leading-none">Pago</p>
              <p className="text-sm font-black text-emerald-700 leading-none mt-0.5">
                {financialCalculator.formatCurrency(caixaTotalValue)}
              </p>
            </div>
          </div>
          {/* Competências */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl shadow-sm">
            <UserCheck size={16} className="text-blue-600" />
            <div className="flex flex-col">
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider leading-none">Pendente</p>
              <p className="text-sm font-black text-blue-700 leading-none mt-0.5">
                {financialCalculator.formatCurrency(competenciaTotalValue)}
              </p>
            </div>
          </div>
        </div>



        <button className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors" title="Exportar">
          <Download size={16} />
        </button>

        {hasPermissionCreate && (
          <button
            onClick={onNewLeadClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md font-semibold text-sm whitespace-nowrap"
          >
            <Plus size={16} />
            Novo Lead
          </button>
        )}
      </div>
    </div>
  );
};
