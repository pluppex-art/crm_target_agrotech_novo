import { getSupabase, setCors, checkAuth } from '../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  const supabase = getSupabase() as any;

  if (req.method === 'GET') {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, description, due_date, scheduled_time, status, priority, category, lead_id, responsavel_usuario_id, created_at')
        .order('due_date', { ascending: true });
      if (error) throw error;

      const rows = tasks || [];
      const userIds = [...new Set(rows.map((t: any) => t.responsavel_usuario_id).filter(Boolean))];
      const leadIds = [...new Set(rows.map((t: any) => t.lead_id).filter(Boolean))];

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
        data: rows.map((t: any) => ({
          id: t.id,
          titulo: t.title,
          descricao: t.description ?? null,
          lead_id: t.lead_id ?? null,
          lead_nome: leadsMap.get(t.lead_id)?.name ?? null,
          responsavel: perfisMap.get(t.responsavel_usuario_id)?.name ?? null,
          prazo: t.due_date ?? null,
          horario: t.scheduled_time ?? null,
          status: t.status,
          prioridade: t.priority,
          categoria: t.category ?? null,
          criado_em: t.created_at,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { leadId, titulo, prazo, prioridade } = req.body ?? {};
    if (!leadId || !titulo) {
      return res.status(400).json({ error: 'leadId e titulo são obrigatórios.' });
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          lead_id: leadId,
          title: titulo,
          due_date: prazo ?? null,
          status: 'pending',
          priority: prioridade ?? 'medium',
        }])
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json({
        data: {
          id: data.id,
          lead_id: data.lead_id,
          titulo: data.title,
          prazo: data.due_date ?? null,
          status: data.status,
          prioridade: data.priority,
          criado_em: data.created_at,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
