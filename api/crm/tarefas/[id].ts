import { getSupabase, setCors, checkAuth } from '../../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id é obrigatório.' });

  const body = req.body ?? {};
  const allowed: Record<string, string> = {
    titulo: 'title',
    descricao: 'description',
    prazo: 'due_date',
    horario: 'scheduled_time',
    status: 'status',
    prioridade: 'priority',
    categoria: 'category',
  };

  const patch: Record<string, any> = {};
  for (const [key, col] of Object.entries(allowed)) {
    if (key in body) patch[col] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
  }

  try {
    const supabase = getSupabase() as any;
    const { data, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select('id, title, status, priority, due_date')
      .single();
    if (error) throw error;
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
