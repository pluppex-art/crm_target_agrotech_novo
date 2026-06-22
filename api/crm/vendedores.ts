import { getSupabase, setCors, checkAuth } from '../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  try {
    const supabase = getSupabase() as any;
    const { data: perfis, error } = await supabase
      .from('perfis')
      .select('id, name, email, phone, department, status, avatar_url, in_round_robin, role_id')
      .order('name');
    if (error) throw error;

    const rows = perfis || [];
    const roleIds = [...new Set(rows.map((p: any) => p.role_id).filter(Boolean))];
    const { data: cargosData } = roleIds.length
      ? await supabase.from('cargos').select('id, name').in('id', roleIds)
      : { data: [] };
    const cargosMap = new Map<string, any>((cargosData || []).map((c: any) => [c.id, c]));

    return res.json({
      data: rows.map((p: any) => ({
        id: p.id,
        nome: p.name,
        email: p.email ?? null,
        telefone: p.phone ?? null,
        departamento: p.department ?? null,
        status: p.status ?? null,
        cargo: cargosMap.get(p.role_id)?.name ?? null,
        avatar: p.avatar_url ?? null,
        no_rodizio: p.in_round_robin ?? true,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
