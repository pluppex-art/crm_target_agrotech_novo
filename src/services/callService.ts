import { supabase } from '../lib/supabase';

export interface CallTrendPoint { date: string; [userId: string]: number | string; }

export const callService = {
  async getLeadTotalCount(leadId: string): Promise<number> {
    const { count, error } = await (supabase as any)
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .eq('lead_id', leadId);
    if (error) { console.error('callService.getLeadTotalCount:', error); return 0; }
    return count ?? 0;
  },

  async getLeadCountByType(leadId: string, type: 'atendida' | 'nao_atendida'): Promise<number> {
    const { count, error } = await (supabase as any)
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .eq('type', type);
    if (error) { console.error('callService.getLeadCountByType:', error); return 0; }
    return count ?? 0;
  },

  async logCall(userId: string, leadId: string, type: 'atendida' | 'nao_atendida' = 'atendida'): Promise<boolean> {
    const { error } = await (supabase as any)
      .from('call_logs')
      .insert([{ user_id: userId, lead_id: leadId, type }]);
    if (error) { console.error('callService.logCall:', error); return false; }
    return true;
  },

  async removeLastCallByType(leadId: string, type: 'atendida' | 'nao_atendida'): Promise<boolean> {
    const { data: lastCall, error: fetchErr } = await (supabase as any)
      .from('call_logs')
      .select('id')
      .eq('lead_id', leadId)
      .eq('type', type)
      .order('called_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !lastCall) {
      if (fetchErr) console.error('callService.removeLastCallByType fetch:', fetchErr);
      return false;
    }

    const { error: delErr } = await (supabase as any)
      .from('call_logs')
      .delete()
      .eq('id', lastCall.id);

    if (delErr) { console.error('callService.removeLastCallByType delete:', delErr); return false; }
    return true;
  },

  async removeLastCall(userId: string, leadId: string): Promise<boolean> {
    const { data: lastCall, error: fetchErr } = await (supabase as any)
      .from('call_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('lead_id', leadId)
      .order('called_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !lastCall) {
      if (fetchErr) console.error('callService.removeLastCall fetch:', fetchErr);
      return false;
    }

    const { error: delErr } = await (supabase as any)
      .from('call_logs')
      .delete()
      .eq('id', lastCall.id);

    if (delErr) {
      console.error('callService.removeLastCall delete:', delErr);
      return false;
    }

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
    return this.getTeamRangeStats(start.toISOString(), end.toISOString());
  },

  async getTeamRangeStats(startDate: string, endDate: string): Promise<{ user_id: string; user_name: string; count: number; atendidas: number; nao_atendidas: number; isVendedor: boolean }[]> {
    const [{ data: profiles, error: profErr }, { data: cargosData }] = await Promise.all([
      (supabase as any).from('perfis').select('id, name, role_id').eq('status', 'active'),
      (supabase as any).from('cargos').select('id, name'),
    ]);
    if (profErr) { console.error('callService.getTeamRangeStats profiles:', profErr); return []; }

    const cargoMap = new Map<string, string>(
      (cargosData || []).map((c: any) => [c.id, (c.name || '').toLowerCase().trim()])
    );

    const allUsers = profiles || [];

    // Use local-friendly date range to ensure we catch all calls in the user's day
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const { data: logs, error: logErr } = await (supabase as any)
      .from('call_logs')
      .select('user_id, type')
      .gte('called_at', start.toISOString())
      .lte('called_at', end.toISOString());
    if (logErr) { console.error('callService.getTeamRangeStats logs:', logErr); }

    const countByUser = new Map<string, { total: number; atendidas: number; nao_atendidas: number }>();
    (logs || []).forEach((l: any) => {
      const stats = countByUser.get(l.user_id) || { total: 0, atendidas: 0, nao_atendidas: 0 };
      stats.total++;
      if (l.type === 'atendida') stats.atendidas++;
      else if (l.type === 'nao_atendida') stats.nao_atendidas++;
      countByUser.set(l.user_id, stats);
    });

    return allUsers.map((p: any) => {
      const stats = countByUser.get(p.id) || { total: 0, atendidas: 0, nao_atendidas: 0 };
      return {
        user_id: p.id,
        user_name: p.name || 'Usuário',
        count: stats.total,
        atendidas: stats.atendidas,
        nao_atendidas: stats.nao_atendidas,
        isVendedor: (cargoMap.get(p.role_id) || '').includes('vendedor'),
      };
    });
  },

  async getTeamCallsTrend(days = 7): Promise<{ sellers: { id: string; name: string }[]; points: CallTrendPoint[] }> {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const { data: profiles } = await (supabase as any)
      .from('perfis')
      .select('id, name, cargos:role_id(name)')
      .eq('status', 'active');

    const sellers: { id: string; name: string }[] = (profiles || []).map((p: any) => ({
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
