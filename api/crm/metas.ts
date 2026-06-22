import { getSupabase, setCors, checkAuth } from '../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  try {
    const supabase = getSupabase() as any;
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({
      data: (data || []).map((g: any) => ({
        id: g.id,
        tipo: g.type,
        vendedor_id: g.seller_id ?? null,
        vendedor_nome: g.seller_name ?? null,
        meta_receita: g.revenue_goal ?? null,
        meta_leads: g.leads_goal ?? null,
        meta_chamadas: g.calls_goal ?? null,
        periodo: g.period ?? null,
        criado_em: g.created_at,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
