import { getSupabase, setCors, checkAuth } from '../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  try {
    const supabase = getSupabase() as any;
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id, name, email, phone, city, product, value, status, substatus,
        responsible, responsavel_usuario_id, stage_id,
        stars, lead_source, seller_origin, cost_center,
        pix_completed, contract_signed, motivo_perda,
        created_at, updated_at, last_contact_at
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = leads || [];
    const stageIds = [...new Set(rows.map((l: any) => l.stage_id).filter(Boolean))];
    const { data: stagesData } = stageIds.length
      ? await supabase.from('pipeline_stages').select('id, name').in('id', stageIds)
      : { data: [] };
    const stagesMap = new Map<string, any>((stagesData || []).map((s: any) => [s.id, s]));

    return res.json({
      data: rows.map((l: any) => ({
        id: l.id,
        nome: l.name,
        email: l.email ?? null,
        telefone: l.phone ?? null,
        cidade: l.city ?? null,
        produto: l.product ?? null,
        valor: Number(l.value) || 0,
        status: l.status ?? null,
        substatus: l.substatus ?? null,
        estagio: stagesMap.get(l.stage_id)?.name ?? null,
        responsavel: l.responsible ?? null,
        responsavel_id: l.responsavel_usuario_id ?? null,
        estrelas: l.stars ?? null,
        origem: l.lead_source ?? null,
        empresa_origem: l.seller_origin ?? null,
        centro_custo: l.cost_center ?? null,
        pix_pago: l.pix_completed ?? false,
        contrato_assinado: l.contract_signed ?? false,
        motivo_perda: l.motivo_perda ?? null,
        criado_em: l.created_at,
        atualizado_em: l.updated_at ?? null,
        ultimo_contato: l.last_contact_at ?? null,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
