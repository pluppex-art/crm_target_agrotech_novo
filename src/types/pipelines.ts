export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  is_active: boolean;
}

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
}

export type PipelineSelectOption = {
  id: string;
  name: string;
  stages: PipelineStage[];
};
