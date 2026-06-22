import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const expected = process.env.TARGET_API_KEY;
  const auth = (req.headers['authorization'] as string | undefined) ?? '';
  if (!expected || auth.slice(7).trim() !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'supabase config missing' });

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) as any;
  const { data, error } = await supabase.from('leads').select('id, name').limit(2);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, count: data?.length ?? 0, sample: data });
}
