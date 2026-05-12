import { supabase } from '../lib/supabase';
import type { PontoStatus } from '../store/useTimeClockStore';

export interface TimeClockRecord {
  id: string;
  user_id: string;
  type: 'entrada' | 'saida_intervalo' | 'volta_intervalo' | 'saida';
  timestamp: string;
  location?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface TimeClockRecordWithProfile extends TimeClockRecord {
  user_name: string;
  user_department: string | null;
  user_avatar: string | null;
}

function typeToStatus(type: TimeClockRecord['type']): PontoStatus {
  if (type === 'entrada') return 'working';
  if (type === 'saida_intervalo') return 'break';
  if (type === 'volta_intervalo') return 'returned';
  return 'off';
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const timeClockService = {
  async getTodayRecords(userId: string): Promise<TimeClockRecord[]> {
    const { start, end } = todayRange();
    const { data, error } = await supabase
      .from('time_clock_records' as any)
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', start)
      .lte('timestamp', end)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as TimeClockRecord[];
  },

  async getLatestRecord(userId: string): Promise<TimeClockRecord | null> {
    const { data, error } = await supabase
      .from('time_clock_records' as any)
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as TimeClockRecord | null;
  },

  async punch(userId: string, type: TimeClockRecord['type'], location?: string): Promise<TimeClockRecord> {
    const { data, error } = await supabase
      .from('time_clock_records' as any)
      .insert([{ user_id: userId, type, location: location || null }])
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TimeClockRecord;
  },

  async getAllTodayRecords(): Promise<TimeClockRecordWithProfile[]> {
    const { start, end } = todayRange();
    const { data, error } = await supabase
      .from('time_clock_records' as any)
      .select(`
        *,
        perfis!inner (name, department, avatar_url)
      `)
      .gte('timestamp', start)
      .lte('timestamp', end)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return ((data || []) as any[]).map(row => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      timestamp: row.timestamp,
      location: row.location,
      notes: row.notes,
      created_at: row.created_at,
      user_name: row.perfis?.name || 'Usuário',
      user_department: row.perfis?.department || null,
      user_avatar: row.perfis?.avatar_url || null,
    }));
  },

  // Returns latest record per user for today (for admin status overview)
  async getTeamStatusToday(): Promise<{ user_id: string; user_name: string; user_department: string | null; user_avatar: string | null; status: PontoStatus; last_record: TimeClockRecord | null }[]> {
    const { start, end } = todayRange();

    // Fetch all active profiles
    const { data: profiles, error: profErr } = await supabase
      .from('perfis')
      .select('id, name, department, avatar_url')
      .eq('status', 'active');

    if (profErr) throw profErr;

    // Fetch all today's records
    const { data: records, error: recErr } = await supabase
      .from('time_clock_records' as any)
      .select('*')
      .gte('timestamp', start)
      .lte('timestamp', end)
      .order('timestamp', { ascending: false });

    if (recErr) throw recErr;

    const recordsByUser = new Map<string, TimeClockRecord[]>();
    ((records || []) as unknown as TimeClockRecord[]).forEach(r => {
      const list = recordsByUser.get(r.user_id) || [];
      list.push(r);
      recordsByUser.set(r.user_id, list);
    });

    return (profiles || []).map(p => {
      const userRecords = recordsByUser.get(p.id) || [];
      const lastRecord = userRecords[0] || null;
      return {
        user_id: p.id,
        user_name: p.name || 'Usuário',
        user_department: p.department,
        user_avatar: p.avatar_url,
        status: lastRecord ? typeToStatus(lastRecord.type) : 'off',
        last_record: lastRecord,
      };
    });
  },
};
