import { getSupabase, setCors, checkAuth } from '../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  try {
    const supabase = getSupabase() as any;
    const { data: enrollments, error } = await supabase
      .from('lead_class_enrollments')
      .select('id, lead_id, class_id, board_status, status, valor_recebido, taxa_matricula_recebido, pix_completed, contract_signed, seller_origin, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = enrollments || [];
    const leadIds = [...new Set(rows.map((r: any) => r.lead_id).filter(Boolean))];
    const classIds = [...new Set(rows.map((r: any) => r.class_id).filter(Boolean))];

    const [{ data: leadsData }, { data: turmasData }] = await Promise.all([
      leadIds.length
        ? supabase.from('leads').select('id, name, email, phone').in('id', leadIds)
        : Promise.resolve({ data: [] }),
      classIds.length
        ? supabase.from('turmas').select('id, name, date, category').in('id', classIds)
        : Promise.resolve({ data: [] }),
    ]);

    const leadsMap = new Map<string, any>((leadsData || []).map((l: any) => [l.id, l]));
    const turmasMap = new Map<string, any>((turmasData || []).map((t: any) => [t.id, t]));

    return res.json({
      data: rows.map((m: any) => {
        const lead = leadsMap.get(m.lead_id);
        const turma = turmasMap.get(m.class_id);
        return {
          id: m.id,
          lead_id: m.lead_id,
          lead_nome: lead?.name ?? null,
          lead_email: lead?.email ?? null,
          lead_telefone: lead?.phone ?? null,
          turma_id: m.class_id,
          turma_nome: turma?.name ?? null,
          turma_data: turma?.date ?? null,
          turma_categoria: turma?.category ?? null,
          status_quadro: m.board_status ?? null,
          status: m.status ?? null,
          valor_recebido: Number(m.valor_recebido) || 0,
          taxa_matricula_recebido: Number(m.taxa_matricula_recebido) || 0,
          pix_pago: m.pix_completed ?? false,
          contrato_assinado: m.contract_signed ?? false,
          empresa_origem: m.seller_origin ?? null,
          criado_em: m.created_at,
        };
      }),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
