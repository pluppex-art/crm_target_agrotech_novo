import { getSupabase, setCors, checkAuth } from '../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  const { leadId, texto } = req.body ?? {};
  if (!leadId || !texto) {
    return res.status(400).json({ error: 'leadId e texto são obrigatórios.' });
  }

  try {
    const supabase = getSupabase() as any;
    const { data, error } = await supabase
      .from('notes')
      .insert([{ lead_id: leadId, content: texto, author_name: 'API Externa' }])
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({
      data: {
        id: data.id,
        lead_id: data.lead_id,
        texto: data.content,
        criado_em: data.created_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
