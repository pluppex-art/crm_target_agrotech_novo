import { getSupabaseClient } from '../lib/supabase';

// Interfaces moved to src/types/pipelines.ts

import { Pipeline, PipelineStage, PipelineWithStages } from '../types/pipelines';

export const pipelineService = {
  async getPipelines(): Promise<PipelineWithStages[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data: pipelines, error: pipelineError } = await supabase
      .from('pipelines')
      .select(`
        *,
        pipeline_stages (
          id, pipeline_id, name, color, position, is_active
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (pipelineError) {
      console.error('Error fetching pipelines:', pipelineError);
      return [];
    }

    return (pipelines || []).map((p: any) => ({
      ...p,
      stages: (p.pipeline_stages || [])
        .filter((s: any) => s.is_active !== false)
        .sort((a: any, b: any) => a.position - b.position),
    }));
  },

  async getStages(pipelineId: string): Promise<PipelineStage[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('is_active', true)
      .order('position');

    if (error) {
      console.error('Error fetching stages:', error);
      return [];
    }

    return data || [];
  },

  async createPipeline(name: string, description?: string): Promise<Pipeline | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('pipelines')
      .insert([{ name, description, is_active: true }])
      .select()
      .single();

    if (error) {
      console.error('Error creating pipeline:', error);
      return null;
    }

    return data;
  },

  async updatePipeline(id: string, updates: Partial<Pipeline>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('pipelines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating pipeline:', error);
      return false;
    }

    return true;
  },

  async deletePipeline(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('pipelines')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id); // Soft delete

    if (error) {
      console.error('Error deleting pipeline:', error);
      return false;
    }

    return true;
  },

  async createStage(pipelineId: string, name: string, color: string = '#3B82F6', position: number): Promise<PipelineStage | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert([{ pipeline_id: pipelineId, name, color, position, is_active: true }])
      .select()
      .single();

    if (error) {
      console.error('Error creating stage:', error);
      return null;
    }

    return data;
  },

  async updateStage(id: string, updates: Partial<PipelineStage>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating stage:', error);
      return false;
    }

    return true;
  },

  async deleteStage(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting stage:', error);
      return false;
    }

    return true;
  },

  async reorderStages(_pipelineId: string, stageIds: string[]): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const updates = stageIds.map((id, index) => ({
      id,
      position: index
    }));

    const { error } = await supabase
      .from('pipeline_stages')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('Error reordering stages:', error);
      return false;
    }

    return true;
  }
};

