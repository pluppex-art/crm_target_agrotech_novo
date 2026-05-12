import { supabase } from '../lib/supabase';

export const callService = {
  async logCall(userId: string, leadId: string): Promise<boolean> {
    const { error } = await (supabase as any)
      .from('call_logs')
      .insert([{ user_id: userId, lead_id: leadId }]);
    if (error) { console.error('callService.logCall:', error); return false; }
    return true;
  },

  async getTodayCount(userId: string): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const { count, error } = await (supabase as any)
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('called_at', start.toISOString())
      .lte('called_at', end.toISOString());
    if (error) { console.error('callService.getTodayCount:', error); return 0; }
    return count ?? 0;
  },

  async getTeamTodayStats(): Promise<{ user_id: string; user_name: string; count: number }[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const { data: profiles, error: profErr } = await (supabase as any)
      .from('perfis')
      .select('id, name')
      .eq('status', 'active');
    if (profErr) { console.error('callService.getTeamTodayStats profiles:', profErr); return []; }

    const { data: logs, error: logErr } = await (supabase as any)
      .from('call_logs')
      .select('user_id')
      .gte('called_at', start.toISOString())
      .lte('called_at', end.toISOString());
    if (logErr) { console.error('callService.getTeamTodayStats logs:', logErr); return []; }

    const countByUser = new Map<string, number>();
    (logs || []).forEach((l: any) => {
      countByUser.set(l.user_id, (countByUser.get(l.user_id) ?? 0) + 1);
    });

    return (profiles || []).map((p: any) => ({
      user_id: p.id,
      user_name: p.name || 'Usuário',
      count: countByUser.get(p.id) ?? 0,
    }));
  },
};
