import { create } from 'zustand';
import { pipelineService } from '../services/pipelineService';
import { PipelineWithStages, PipelineStage, Pipeline } from '../types/pipelines';
import { getSupabaseClient } from '../lib/supabase';

interface PipelineState {
  pipelines: PipelineWithStages[];
  currentPipelineId: string | undefined;
  isLoading: boolean;
  fetchPipelines: () => Promise<void>;
  setCurrentPipeline: (pipelineId: string) => void;
  createPipeline: (name: string, description?: string) => Promise<void>;
  updatePipeline: (id: string, updates: Partial<Pipeline>) => Promise<void>;
  deletePipeline: (id: string) => Promise<void>;
  createStage: (pipelineId: string, name: string, color?: string, position?: number) => Promise<void>;
  updateStage: (id: string, updates: Partial<PipelineStage>) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  reorderStages: (pipelineId: string, stageIds: string[]) => Promise<void>;
  getStages: (pipelineId: string) => PipelineStage[];
  subscribe: () => () => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelines: [],
  currentPipelineId: undefined,
  isLoading: false,

  fetchPipelines: async () => {
    set({ isLoading: true });
    try {
      const pipelines = await pipelineService.getPipelines();
      set({ 
        pipelines,
        currentPipelineId: pipelines[0]?.id || undefined 
      });
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentPipeline: (pipelineId: string) => {
    set({ currentPipelineId: pipelineId });
  },

  getStages: (pipelineId: string) => {
    const pipeline = get().pipelines.find(p => p.id === pipelineId);
    return pipeline?.stages || [];
  },

  createPipeline: async (name, description) => {
    try {
      const newPipeline = await pipelineService.createPipeline(name, description);
      if (newPipeline) {
        set((state) => ({ pipelines: [...state.pipelines, { ...newPipeline, stages: [] }] }));
      }
    } catch (error) {
      console.error('Error creating pipeline:', error);
    }
  },

  updatePipeline: async (id, updates) => {
    try {
      const success = await pipelineService.updatePipeline(id, updates);
      if (success) {
        set((state) => ({
          pipelines: state.pipelines.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
      }
    } catch (error) {
      console.error('Error updating pipeline:', error);
    }
  },

  deletePipeline: async (id) => {
    try {
      const success = await pipelineService.deletePipeline(id);
      if (success) {
        set((state) => ({
          pipelines: state.pipelines.filter(p => p.id !== id),
          currentPipelineId: state.currentPipelineId === id ? state.pipelines.find(p => p.id !== id)?.id || undefined : state.currentPipelineId
        }));
      }
    } catch (error) {
      console.error('Error deleting pipeline:', error);
    }
  },

  createStage: async (pipelineId, name, color = '#3B82F6', position = 0) => {
    try {
      const newStage = await pipelineService.createStage(pipelineId, name, color, position);
      if (newStage) {
        set((state) => ({
          pipelines: state.pipelines.map(p => 
            p.id === pipelineId 
              ? { ...p, stages: [...p.stages, newStage].sort((a, b) => a.position - b.position) }
              : p
          )
        }));
      }
    } catch (error) {
      console.error('Error creating stage:', error);
    }
  },

  updateStage: async (id, updates) => {
    try {
      const success = await pipelineService.updateStage(id, updates);
      if (success) {
        set((state) => ({
          pipelines: state.pipelines.map(p => ({
            ...p,
            stages: p.stages.map(s => s.id === id ? { ...s, ...updates } : s).sort((a, b) => a.position - b.position)
          }))
        }));
      }
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  },

  deleteStage: async (id) => {
    try {
      const success = await pipelineService.deleteStage(id);
      if (success) {
        set((state) => ({
          pipelines: state.pipelines.map(p => ({
            ...p,
            stages: p.stages.filter(s => s.id !== id)
          }))
        }));
      }
    } catch (error) {
      console.error('Error deleting stage:', error);
    }
  },

  reorderStages: async (pipelineId, stageIds) => {
    try {
      const success = await pipelineService.reorderStages(pipelineId, stageIds);
      if (success) {
        set((state) => ({
          pipelines: state.pipelines.map(p =>
            p.id === pipelineId
              ? { ...p, stages: stageIds.map(id => p.stages.find(s => s.id === id)! ) }
              : p
          )
        }));
      }
    } catch (error) {
      console.error('Error reordering stages:', error);
    }
  },

  subscribe: () => {
    const supabase = getSupabaseClient();

    const channelId = `realtime:pipelines-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipelines' }, (payload) => {
        console.log('Realtime Pipeline Event:', payload.eventType);
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => {
          let updated = [...state.pipelines];
          if (eventType === 'INSERT') {
            if (!updated.some(p => p.id === (newRecord as Pipeline).id)) {
              updated = [{ ...(newRecord as Pipeline), stages: [] }, ...updated];
            }
          } else if (eventType === 'UPDATE') {
            updated = updated.map(p => p.id === (newRecord as Pipeline).id ? { ...p, ...newRecord } : p);
          } else if (eventType === 'DELETE') {
            updated = updated.filter(p => p.id !== (oldRecord as any).id);
          }
          return { pipelines: updated };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_stages' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => ({
          pipelines: state.pipelines.map(p => {
            if (eventType === 'INSERT') {
              const stage = newRecord as PipelineStage;
              if (p.id !== stage.pipeline_id) return p;
              if (p.stages.some(s => s.id === stage.id)) return p;
              return { ...p, stages: [...p.stages, stage].sort((a, b) => a.position - b.position) };
            } else if (eventType === 'UPDATE') {
              const stage = newRecord as PipelineStage;
              if (p.id !== stage.pipeline_id) return p;
              return { ...p, stages: p.stages.map(s => s.id === stage.id ? { ...s, ...stage } : s).sort((a, b) => a.position - b.position) };
            } else if (eventType === 'DELETE') {
              return { ...p, stages: p.stages.filter(s => s.id !== (oldRecord as any).id) };
            }
            return p;
          })
        }));
      })
      .subscribe((status) => {
        console.log(`Realtime Pipeline Status (${channelId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
