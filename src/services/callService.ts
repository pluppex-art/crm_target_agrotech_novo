import { supabase } from '../lib/supabase';
import { isVendedor } from '../lib/utils';

export interface CallTrendPoint { date: string; [userId: string]: number | string; }

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
      .select('id, name, role, cargo, cargos:role_id(name)')
      .eq('status', 'active');
    if (profErr) { console.error('callService.getTeamTodayStats profiles:', profErr); return []; }

    const sellers = (profiles || []).filter((p: any) => isVendedor(p));

    const { data: logs, error: logErr } = await (supabase as any)
      .from('call_logs')
      .select('user_id')
      .gte('called_at', start.toISOString())
      .lte('called_at', end.toISOString());
    if (logErr) { console.error('callService.getTeamTodayStats logs:', logErr); }

    const countByUser = new Map<string, number>();
    (logs || []).forEach((l: any) => {
      countByUser.set(l.user_id, (countByUser.get(l.user_id) ?? 0) + 1);
    });

    return sellers.map((p: any) => ({
      user_id: p.id,
      user_name: p.name || 'Usuário',
      count: countByUser.get(p.id) ?? 0,
    }));
  },

  async getTeamCallsTrend(days = 7): Promise<{ sellers: { id: string; name: string }[]; points: CallTrendPoint[] }> {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const { data: profiles } = await (supabase as any)
      .from('perfis')
      .select('id, name, role, cargo, cargos:role_id(name)')
      .eq('status', 'active');

    const sellerProfiles = (profiles || []).filter((p: any) => isVendedor(p));
    const sellers: { id: string; name: string }[] = sellerProfiles.map((p: any) => ({
      id: p.id,
      name: p.name || 'Usuário',
    }));

    const { data: logs } = await (supabase as any)
      .from('call_logs')
      .select('user_id, called_at')
      .gte('called_at', start.toISOString())
      .lte('called_at', end.toISOString());

    const dateKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateKeys.push(d.toISOString().split('T')[0]);
    }

    const counts: Record<string, Record<string, number>> = {};
    dateKeys.forEach(dk => { counts[dk] = {}; });
    (logs || []).forEach((l: any) => {
      const dk = l.called_at.split('T')[0];
      if (!counts[dk]) return;
      counts[dk][l.user_id] = (counts[dk][l.user_id] ?? 0) + 1;
    });

    const points: CallTrendPoint[] = dateKeys.map(dk => {
      const d = new Date(dk + 'T12:00:00');
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const point: CallTrendPoint = { date: label };
      sellers.forEach(s => { point[s.id] = counts[dk]?.[s.id] ?? 0; });
      return point;
    });

    return { sellers, points };
  },
};
