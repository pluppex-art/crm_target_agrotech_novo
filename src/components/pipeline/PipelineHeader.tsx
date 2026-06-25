import React from 'react';
import { Download, Plus, LayoutGrid, List } from 'lucide-react';

import { PipelineSelect } from './PipelineSelect';
import { PipelineMetricCards } from './PipelineMetricCards';
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
  viewMode: 'kanban' | 'list';
  onViewModeChange: (mode: 'kanban' | 'list') => void;
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
  viewMode,
  onViewModeChange,
}) => {

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Title & Pipeline Selector */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            Pipeline
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
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
        <PipelineMetricCards pago={caixaTotalValue} pendente={competenciaTotalValue} />



        <button className="p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors" title="Exportar">
          <Download size={16} />
        </button>

        <div className="flex items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden h-[34px]">
          <button
            onClick={() => onViewModeChange('kanban')}
            className={cn(
              "p-1.5 transition-colors h-full flex items-center px-2",
              viewMode === 'kanban' ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold" : "text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700"
            )}
            title="Visualização Kanban"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              "p-1.5 transition-colors h-full flex items-center px-2 border-l border-gray-100 dark:border-slate-700",
              viewMode === 'list' ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold" : "text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700"
            )}
            title="Visualização em Lista"
          >
            <List size={16} />
          </button>
        </div>

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
