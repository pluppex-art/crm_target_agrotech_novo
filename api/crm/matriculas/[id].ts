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
    status: 'status',
    status_quadro: 'board_status',
    pix_pago: 'pix_completed',
    contrato_assinado: 'contract_signed',
    valor_recebido: 'valor_recebido',
    taxa_matricula_recebido: 'taxa_matricula_recebido',
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
      .from('lead_class_enrollments')
      .update(patch)
      .eq('id', id)
      .select('id, lead_id, class_id, status, board_status, pix_completed, contract_signed')
      .single();
    if (error) throw error;
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
