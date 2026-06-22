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
    nome: 'name',
    email: 'email',
    telefone: 'phone',
    cidade: 'city',
    produto: 'product',
    valor: 'value',
    status: 'status',
    substatus: 'substatus',
    responsavel_id: 'responsavel_usuario_id',
    estagio_id: 'stage_id',
    motivo_perda: 'motivo_perda',
    pix_pago: 'pix_completed',
    contrato_assinado: 'contract_signed',
  };

  const patch: Record<string, any> = {};
  for (const [key, col] of Object.entries(allowed)) {
    if (key in body) patch[col] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
  }
  patch.updated_at = new Date().toISOString();

  try {
    const supabase = getSupabase() as any;
    const { data, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', id)
      .select('id, name, email, phone, status, substatus, updated_at')
      .single();
    if (error) throw error;
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
