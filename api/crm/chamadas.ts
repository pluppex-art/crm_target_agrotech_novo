import { getSupabase, setCors, checkAuth } from '../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  try {
    const supabase = getSupabase() as any;
    const { data: logs, error } = await supabase
      .from('call_logs')
      .select('id, user_id, lead_id, type, called_at')
      .order('called_at', { ascending: false });
    if (error) throw error;

    const calls = logs || [];
    const userIds = [...new Set(calls.map((c: any) => c.user_id).filter(Boolean))];
    const leadIds = [...new Set(calls.map((c: any) => c.lead_id).filter(Boolean))];

    const [{ data: perfisData }, { data: leadsData }] = await Promise.all([
      userIds.length
        ? supabase.from('perfis').select('id, name').in('id', userIds)
        : Promise.resolve({ data: [] }),
      leadIds.length
        ? supabase.from('leads').select('id, name').in('id', leadIds)
        : Promise.resolve({ data: [] }),
    ]);

    const perfisMap = new Map<string, any>((perfisData || []).map((p: any) => [p.id, p]));
    const leadsMap = new Map<string, any>((leadsData || []).map((l: any) => [l.id, l]));

    return res.json({
      data: calls.map((c: any) => ({
        id: c.id,
        vendedor_id: c.user_id ?? null,
        vendedor_nome: perfisMap.get(c.user_id)?.name ?? null,
        lead_id: c.lead_id ?? null,
        lead_nome: leadsMap.get(c.lead_id)?.name ?? null,
        tipo: c.type ?? null,
        realizada_em: c.called_at,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
