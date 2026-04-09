import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, X, Check, Pencil, ChevronDown, Settings2 } from 'lucide-react';
import { usePipelineStore } from '../../store/usePipelineStore';
import { PipelineStage, PipelineWithStages } from '../../types/pipelines';
import { cn } from '../../lib/utils';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#64748b', '#1e293b',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
            value === c ? 'border-slate-800 scale-110' : 'border-transparent'
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

interface StageColumnProps {
  stage: PipelineStage;
  onUpdate: (id: string, updates: Partial<PipelineStage>) => void;
  onDelete: (id: string) => void;
}

function StageColumn({ stage, onUpdate, onDelete }: StageColumnProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const [color, setColor] = useState(stage.color);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleSave = () => {
    if (name.trim()) onUpdate(stage.id, { name: name.trim(), color });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(stage.name);
    setColor(stage.color);
    setEditing(false);
  };

  return (
    <div className="flex-shrink-0 w-56 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Color top stripe */}
      <div className="h-2 w-full" style={{ backgroundColor: color }} />

      {editing ? (
        <div className="p-4 space-y-3 flex-1">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
            className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-800"
          />
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <Check size={12} /> Salvar
            </button>
            <button
              onClick={handleCancel}
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 flex-1 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-sm font-bold text-slate-700 leading-tight">{stage.name}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete(stage.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Placeholder cards to give column feel */}
          <div className="space-y-2 flex-1">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-50 border border-slate-100 rounded-xl" />
            ))}
          </div>

          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Etapa {stage.position + 1}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface AddColumnProps {
  pipelineId: string;
  count: number;
  onAdd: (pipelineId: string, name: string, color: string, position: number) => void;
}

function AddColumn({ pipelineId, count, onAdd }: AddColumnProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(pipelineId, name.trim(), color, count);
    setName('');
    setColor('#3b82f6');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 w-56 min-h-[200px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50/40 transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
          <Plus size={20} className="group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-sm font-bold">Nova etapa</span>
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-56 bg-white border-2 border-emerald-300 rounded-2xl shadow-sm overflow-hidden">
      <div className="h-2 w-full" style={{ backgroundColor: color }} />
      <div className="p-4 space-y-3">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setOpen(false); setName(''); } }}
          placeholder="Nome da etapa"
          className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:font-normal placeholder:text-slate-400 text-slate-800"
        />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            <Check size={12} /> Adicionar
          </button>
          <button
            onClick={() => { setOpen(false); setName(''); }}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ManagePipelines() {
  const {
    pipelines,
    isLoading,
    fetchPipelines,
    createPipeline,
    updatePipeline,
    deletePipeline,
    createStage,
    updateStage,
    deleteStage,
  } = usePipelineStore();

  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editPipelineName, setEditPipelineName] = useState('');
  const [pipelineMenuOpen, setPipelineMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);

  useEffect(() => {
    if (!activePipelineId && pipelines.length > 0) {
      setActivePipelineId(pipelines[0].id);
    }
  }, [pipelines, activePipelineId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPipelineMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) ?? null;

  const handleCreatePipeline = async () => {
    if (!newName.trim()) return;
    await createPipeline(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
    setIsCreateOpen(false);
  };

  const handleDeleteStage = async (id: string) => {
    if (confirm('Excluir esta etapa?')) await deleteStage(id);
  };

  const handleDeletePipeline = async (id: string) => {
    if (!confirm('Excluir este pipeline e todas as suas etapas?')) return;
    await deletePipeline(id);
    setActivePipelineId(pipelines.find((p) => p.id !== id)?.id ?? null);
    setPipelineMenuOpen(false);
  };

  const handleSavePipelineName = async () => {
    if (editPipelineName.trim() && editingPipelineId) {
      await updatePipeline(editingPipelineId, { name: editPipelineName.trim() });
    }
    setEditingPipelineId(null);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded-xl w-48 mb-6" />
          <div className="flex gap-3 mb-8">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 w-32 bg-slate-200 rounded-xl" />)}
          </div>
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="w-56 h-48 bg-slate-100 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-slate-50/50 flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciar Pipelines</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure as etapas de cada pipeline de vendas.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors text-sm font-bold shadow-sm"
        >
          <Plus size={16} />
          Novo Pipeline
        </button>
      </div>

      {pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-24 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Settings2 size={28} className="text-slate-300" />
          </div>
          <p className="font-semibold text-slate-500">Nenhum pipeline criado</p>
          <p className="text-sm mt-1">Clique em "Novo Pipeline" para começar.</p>
        </div>
      ) : (
        <>
          {/* Pipeline tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {pipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePipelineId(p.id)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  activePipelineId === p.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
                )}
              >
                {p.name}
                <span className={cn(
                  'ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full',
                  activePipelineId === p.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  {p.stages.length}
                </span>
              </button>
            ))}
          </div>

          {/* Active pipeline kanban */}
          {activePipeline && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1">
              {/* Pipeline header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                {editingPipelineId === activePipeline.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editPipelineName}
                      onChange={(e) => setEditPipelineName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavePipelineName();
                        if (e.key === 'Escape') setEditingPipelineId(null);
                      }}
                      className="text-base font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                    />
                    <button onClick={handleSavePipelineName} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingPipelineId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-800">{activePipeline.name}</h2>
                    {activePipeline.description && (
                      <span className="text-sm text-slate-400">{activePipeline.description}</span>
                    )}
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {activePipeline.stages.length} etapa{activePipeline.stages.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {editingPipelineId !== activePipeline.id && (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setPipelineMenuOpen((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm font-medium"
                    >
                      <Settings2 size={15} />
                      <ChevronDown size={13} />
                    </button>
                    {pipelineMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-44 overflow-hidden">
                        <button
                          onClick={() => {
                            setEditingPipelineId(activePipeline.id);
                            setEditPipelineName(activePipeline.name);
                            setPipelineMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Pencil size={14} /> Renomear
                        </button>
                        <button
                          onClick={() => handleDeletePipeline(activePipeline.id)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} /> Excluir pipeline
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Kanban columns */}
              <div className="p-6 overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 min-h-[240px]">
                  {activePipeline.stages
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((stage) => (
                      <StageColumn
                        key={stage.id}
                        stage={stage}
                        onUpdate={updateStage}
                        onDelete={handleDeleteStage}
                      />
                    ))}
                  <AddColumn
                    pipelineId={activePipeline.id}
                    count={activePipeline.stages.length}
                    onAdd={createStage}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create pipeline modal */}
{isCreateOpen && createPortal(
        <div key="create-pipeline-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">Novo Pipeline</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome *</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePipeline()}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-slate-700"
                  placeholder="Ex: Vendas, Pós-venda..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-slate-700"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePipeline}
                disabled={!newName.trim()}
                className="flex-1 bg-emerald-500 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Criar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
