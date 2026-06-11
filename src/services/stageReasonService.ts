import { supabase as _supabase } from '../lib/supabase';
// Cast to any because lead_stage_reasons is a new table not yet in the generated types
const supabase = _supabase as any;

export const STAGE_REASONS = [
  'sem dinheiro',
  'sem tempo',
  'não viu valor',
  'vai pensar',
  'falou com esposa',
  'falou com sócio',
  'sumiu',
] as const;

export type StageReason = typeof STAGE_REASONS[number];

export const REASON_EMOJIS: Record<string, string> = {
  'sem dinheiro':    '💸',
  'sem tempo':       '⏰',
  'não viu valor':   '🤷',
  'vai pensar':      '🤔',
  'falou com esposa': '👩',
  'falou com sócio': '🤝',
  'sumiu':           '👻',
};

export interface StageReasonRecord {
  id: string;
  lead_id: string;
  lead_name: string;
  stage_name: string;
  reason: StageReason;
  notes?: string | null;
  recorded_by: string;
  recorded_at: string;
}

export interface StageReasonInput {
  lead_id: string;
  lead_name: string;
  stage_name: string;
  reason: StageReason;
  notes?: string;
  recorded_by: string;
}

export interface StageReasonSummary {
  reason: string;
  count: number;
  stage_name?: string;
}

export const stageReasonService = {
  /** Returns true if the stage name should trigger the reason modal. */
  requiresReason(stageName: string): boolean {
    const normalized = stageName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    return normalized.includes('aquecimento') || normalized.includes('perdido');
  },

  async saveReason(data: StageReasonInput): Promise<boolean> {
    try {
      const { error } = await supabase.from('lead_stage_reasons').insert({
        lead_id: data.lead_id,
        lead_name: data.lead_name,
        stage_name: data.stage_name,
        reason: data.reason,
        notes: data.notes?.trim() || null,
        recorded_by: data.recorded_by,
      });
      return !error;
    } catch {
      return false;
    }
  },

  async getSummaryAll(startDate?: string, endDate?: string): Promise<StageReasonSummary[]> {
    try {
      let query = supabase
        .from('lead_stage_reasons')
        .select('reason, stage_name');

      if (startDate) query = query.gte('recorded_at', startDate);
      if (endDate)   query = query.lte('recorded_at', endDate + 'T23:59:59');

      const { data, error } = await query;
      if (error || !data) return [];

      const counts: Record<string, number> = {};
      data.forEach(row => {
        counts[row.reason] = (counts[row.reason] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
    } catch {
      return [];
    }
  },

  async getSummaryByStage(
    stageFilter: 'aquecimento' | 'perdido' | 'all',
    startDate?: string,
    endDate?: string,
  ): Promise<StageReasonSummary[]> {
    try {
      let query = supabase
        .from('lead_stage_reasons')
        .select('reason, stage_name');

      if (stageFilter !== 'all') {
        query = query.ilike('stage_name', `%${stageFilter}%`);
      }
      if (startDate) query = query.gte('recorded_at', startDate);
      if (endDate)   query = query.lte('recorded_at', endDate + 'T23:59:59');

      const { data, error } = await query;
      if (error || !data) return [];

      const counts: Record<string, number> = {};
      data.forEach(row => {
        counts[row.reason] = (counts[row.reason] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
    } catch {
      return [];
    }
  },

  async getRecent(limit = 50): Promise<StageReasonRecord[]> {
    try {
      const { data } = await supabase
        .from('lead_stage_reasons')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(limit);
      return (data as StageReasonRecord[]) || [];
    } catch {
      return [];
    }
  },
};
