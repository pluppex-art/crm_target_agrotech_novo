import { getSupabase, setCors, checkAuth } from '../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  try {
    const supabase = getSupabase() as any;
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('id, description, amount, type, status, payment_date, due_date, lead_id, created_at')
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return res.json({
      data: (data || []).map((t: any) => ({
        id: t.id,
        descricao: t.description ?? null,
        valor: Number(t.amount) || 0,
        tipo: t.type ?? null,
        status: t.status ?? null,
        data_pagamento: t.payment_date ?? null,
        data_vencimento: t.due_date ?? null,
        lead_id: t.lead_id ?? null,
        criado_em: t.created_at,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
