import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Check, X, ChevronDown, Settings2 } from 'lucide-react';
import { usePipelineStore } from '../../store/usePipelineStore';
import { checklistService } from '../../services/checklistService';
import { cn } from '../../lib/utils';

interface ChecklistItem {
  id: string;
  stage_id: string;
  name: string;
  position: number;
  required: boolean;
}

interface StageChecklistProps {
  stageId: string;
  stageName: string;
  checklists: ChecklistItem[];
  onAddChecklist: (stageId: string, name: string) => void;
  onDeleteChecklist: (id: string) => void;
  onReorder: (stageId: string, ids: string[]) => void;
}

function StageChecklist({ stageId, stageName, checklists, onAddChecklist, onDeleteChecklist, onReorder }: StageChecklistProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const handleAdd = () => {
    if (newItemName.trim()) {
      onAddChecklist(stageId, newItemName.trim());
      setNewItemName('');
      setShowAdd(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{stageName}</h3>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
            title="Adicionar item de checklist"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {showAdd && (
        <div className="space-y-2 mb-4">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setShowAdd(false);
            }}
            placeholder="Ex: Contrato assinado, PIX confirmado"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newItemName.trim()}
              className="flex-1 bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              Adicionar
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 min-h-[80px]">
        {checklists.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Nenhum item de checklist</p>
        ) : (
          checklists.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group">
              <span className="text-xs font-medium text-slate-700">{item.name}</span>
              <button
                onClick={() => onDeleteChecklist(item.id)}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                title="Remover item"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ManageStageChecklists() {
  const { pipelines } = usePipelineStore();
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activePipelineId) {
      loadChecklists(activePipelineId);
    }
  }, [activePipelineId]);

  useEffect(() => {
    if (pipelines.length > 0 && !activePipelineId) {
      setActivePipelineId(pipelines[0].id);
    }
  }, [pipelines]);

  const loadChecklists = async (pipelineId: string) => {
    setLoading(true);
    try {
      const data = await checklistService.getChecklistsForPipeline(pipelineId);
      setChecklists(data);
    } catch (error) {
      console.error('Error loading checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChecklist = async (stageId: string, name: string) => {
    const newItem = await checklistService.createChecklist(stageId, name);
    if (newItem) {
      setChecklists(prev => ({
        ...prev,
        [stageId]: [...(prev[stageId] || []), newItem].sort((a, b) => a.position - b.position)
      }));
    }
  };

  const handleDeleteChecklist = async (id: string) => {
    const success = await checklistService.deleteChecklist(id);
    if (success) {
      setChecklists(prev => {
        const newChecklists = { ...prev };
        for (const stageId in newChecklists) {
          newChecklists[stageId] = newChecklists[stageId].filter(item => item.id !== id);
        }
        return newChecklists;
      });
    }
  };

  const activePipeline = pipelines.find(p => p.id === activePipelineId);
  const stages = activePipeline?.stages || [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Checklists de Aprovação</h1>
          <p className="text-sm text-slate-500 mt-1">Configure itens obrigatórios para cada etapa do pipeline.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {pipelines.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePipelineId(p.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all',
              activePipelineId === p.id
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded-xl w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="h-32 bg-slate-200 rounded-xl" />
          </div>
        </div>
      ) : activePipeline ? (
        <div className="space-y-4">
          {stages.map(stage => (
            <StageChecklist
              key={stage.id}
              stageId={stage.id}
              stageName={stage.name}
              checklists={checklists[stage.id] || []}
              onAddChecklist={handleAddChecklist}
              onDeleteChecklist={handleDeleteChecklist}
              onReorder={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <div className="text-center">
            <Settings2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-semibold">Nenhum pipeline disponível</p>
            <p className="text-sm mt-1">Crie um pipeline em Gerenciar Pipelines.</p>
          </div>
        </div>
      )}
    </div>
  );
}
