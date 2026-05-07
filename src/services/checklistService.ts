// stage_checklists table was removed in migration 008 — feature disabled
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
  async getChecklistsForPipeline(_pipelineId: string): Promise<Record<string, ChecklistItem[]>> {
    return {};
  },
  async createChecklist(_stageId: string, _name: string): Promise<ChecklistItem | null> {
    return null;
  },
  async deleteChecklist(_id: string): Promise<boolean> {
    return false;
  },
  async getChecklistsForStage(_stageId: string): Promise<ChecklistItem[]> {
    return [];
  },
  async getCompletionsForLead(_leadId: string): Promise<string[]> {
    return [];
  },
  async toggleCompletion(_leadId: string, _checklistItemId: string, _currentlyCompleted: boolean): Promise<boolean> {
    return false;
  },
};

