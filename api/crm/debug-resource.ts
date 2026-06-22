import { getSupabase, setCors, checkAuth } from './lib';

export default async function handler(req: any, res: any) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  const supabase = getSupabase() as any;
  const { data, error } = await supabase.from('leads').select('id, name').limit(2);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, count: data?.length ?? 0, sample: data });
}
