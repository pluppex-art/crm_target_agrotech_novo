import React from 'react';
import { Loader2, Download, Plus, Trophy, UserCheck, Wallet } from 'lucide-react';

import { PipelineSelect } from './PipelineSelect';
import { cn } from '../../lib/utils';

interface PipelineHeaderProps {
  caixaTotalValue: number;
  competenciaTotalValue: number;
  vendasCaixaValue: number;
  leadsCount: number;
  currentPipelineId: string | null;
  pipelines: any[];
  onPipelineChange: (id: string) => void;
  fetchLeads: (pipelineId: string) => void;
  isLoading: boolean;
  hasPermissionCreate: boolean;
  onNewLeadClick: () => void;
}


export const PipelineHeader: React.FC<PipelineHeaderProps> = ({
  caixaTotalValue,
  competenciaTotalValue,
  vendasCaixaValue,
  leadsCount,
  currentPipelineId,
  pipelines,
  onPipelineChange,
  fetchLeads,
  isLoading,
  hasPermissionCreate,
  onNewLeadClick,
}) => {

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: title + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
            Pipeline de Vendas
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {leadsCount} leads
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Gerencie seu fluxo de vendas e acompanhe o progresso dos leads.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Valores */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Caixa */}
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm mb-1">
                <Trophy size={16} className="text-emerald-600" />
              </div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Ganho Caixa</p>
              <p className="text-sm font-black text-emerald-700 mt-0.5">
                R$ {caixaTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
            {/* Competências */}
            <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm mb-1">
                <UserCheck size={16} className="text-blue-600" />
              </div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Competências</p>
              <p className="text-sm font-black text-blue-700 mt-0.5">
                R$ {competenciaTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
            {/* Vendas Caixa */}
            <div className="px-4 py-2 bg-violet-50 border border-violet-100 rounded-2xl shadow-sm">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm mb-1">
                <Wallet size={16} className="text-violet-600" />
              </div>
              <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest leading-none">Vendas Caixa</p>
              <p className="text-sm font-black text-violet-700 mt-0.5">
                R$ {vendasCaixaValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Refresh */}
          <button

            onClick={() => currentPipelineId && fetchLeads(currentPipelineId!)}
            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm"
            title="Sincronizar"
          >
            <Loader2 className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>

          <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors" title="Exportar">
            <Download size={18} />
          </button>

          {hasPermissionCreate && (
            <button
              onClick={onNewLeadClick}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold whitespace-nowrap"
            >
              <Plus size={18} />
              Novo Lead
            </button>
          )}
        </div>
      </div>


      {/* Row 2: Pipeline selector */}
      <div className="flex items-center gap-3">
        <PipelineSelect
          pipelines={pipelines}
          currentPipelineId={currentPipelineId || ''}
          onPipelineChange={onPipelineChange}
          className="w-full max-w-xs"
        />
      </div>
    </div>
  );
};
