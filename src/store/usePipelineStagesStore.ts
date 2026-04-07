import { create } from 'zustand';

export interface CustomStage {
  id: string;
  title: string;
  color: string;
}

const STAGE_COLORS = [
  'bg-violet-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
];

interface PipelineStagesState {
  customStages: CustomStage[];
  addStage: (title: string, color: string) => void;
  removeStage: (id: string) => void;
}

export const usePipelineStagesStore = create<PipelineStagesState>((set, get) => ({
  customStages: [],

  addStage: (title, color) => {
    const newStage: CustomStage = {
      id: `custom_${Date.now()}`,
      title,
      color,
    };
    set({ customStages: [...get().customStages, newStage] });
  },

  removeStage: (id) => {
    set({ customStages: get().customStages.filter(s => s.id !== id) });
  },
}));

export { STAGE_COLORS };
