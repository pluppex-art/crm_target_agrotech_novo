import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase config missing');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function setCors(res: any, methods = 'GET, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function checkAuth(req: any, res: any): boolean {
  const expected = process.env.TARGET_API_KEY;
  if (!expected) {
    res.status(500).json({ error: 'TARGET_API_KEY não configurada.' });
    return false;
  }
  const auth = req.headers['authorization'] as string | undefined;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization: Bearer {token} obrigatório.' });
    return false;
  }
  if (auth.slice(7).trim() !== expected) {
    res.status(403).json({ error: 'Token inválido.' });
    return false;
  }
  return true;
}
