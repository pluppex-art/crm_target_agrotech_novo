import { getSupabaseClient } from '../lib/supabase';

export interface ChecklistItem {
  id: string;
  stage_id: string;
  name: string;
  position: number;
  required: boolean;
  created_at: string;
  updated_at?: string;
}

export const checklistService = {
  async getChecklistsForPipeline(pipelineId: string): Promise<Record<string, ChecklistItem[]>> {
    const supabase = getSupabaseClient();
    if (!supabase) return {};

    const { data: stages, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('pipeline_id', pipelineId)
      .eq('is_active', true);

    if (stageError || !stages) return {};

    const stageIds = stages.map((s: any) => s.id);

    const { data: checklists, error } = await supabase
      .from('stage_checklists')
      .select('*')
      .in('stage_id', stageIds)
      .order('position');

    if (error) {
      console.error('Error fetching checklists:', error);
      return {};
    }

    const grouped = checklists?.reduce((acc: Record<string, ChecklistItem[]>, item: any) => {
      const stageId = item.stage_id;
      if (!acc[stageId]) acc[stageId] = [];
      acc[stageId].push({
        id: item.id,
        stage_id: item.stage_id,
        name: item.name,
        position: item.position || 0,
        required: item.required || true,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });
      return acc;
    }, {}) || {};

    stages.forEach((stage: any) => {
      if (!grouped[stage.id]) grouped[stage.id] = [];
    });

    return grouped;
  },

  async createChecklist(stageId: string, name: string): Promise<ChecklistItem | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('stage_checklists')
      .insert([{ stage_id: stageId, name, required: true }])
      .select()
      .single();

    if (error) {
      console.error('Error creating checklist:', error);
      return null;
    }

    return {
      id: data.id,
      stage_id: data.stage_id,
      name: data.name,
      position: data.position || 0,
      required: data.required,
      created_at: data.created_at,
    };
  },

  async deleteChecklist(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('stage_checklists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting checklist:', error);
      return false;
    }

    return true;
  },

  async getChecklistsForStage(stageId: string): Promise<ChecklistItem[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('stage_checklists')
      .select('*')
      .eq('stage_id', stageId)
      .order('position');

    if (error) {
      console.error('Error fetching stage checklists:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      stage_id: item.stage_id,
      name: item.name,
      position: item.position || 0,
      required: item.required ?? true,
      created_at: item.created_at,
    }));
  },

  async getCompletionsForLead(leadId: string): Promise<string[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('lead_checklist_completions')
      .select('checklist_item_id')
      .eq('lead_id', leadId);

    if (error) {
      console.error('Error fetching lead checklist completions:', error);
      return [];
    }

    return (data || []).map((c: any) => c.checklist_item_id as string);
  },

  async toggleCompletion(leadId: string, checklistItemId: string, currentlyCompleted: boolean): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    if (currentlyCompleted) {
      const { error } = await supabase
        .from('lead_checklist_completions')
        .delete()
        .eq('lead_id', leadId)
        .eq('checklist_item_id', checklistItemId);

      if (error) { console.error('Error removing completion:', error); return false; }
    } else {
      const { error } = await supabase
        .from('lead_checklist_completions')
        .insert([{ lead_id: leadId, checklist_item_id: checklistItemId }]);

      if (error) { console.error('Error adding completion:', error); return false; }
    }

    return true;
  },
};

