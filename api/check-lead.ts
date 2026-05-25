import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, email } = req.body ?? {};

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Server config error' });

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let exists = false;

  if (phone) {
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length >= 10) {
      const { data } = await supabase
        .from('leads')
        .select('id')
        .or(`phone.ilike.%${normalizedPhone}%,phone.eq.${phone}`)
        .limit(1);
      if (data && data.length > 0) exists = true;
    }
  }

  if (!exists && email?.trim()) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .ilike('email', email.trim())
      .limit(1);
    if (data && data.length > 0) exists = true;
  }

  return res.status(200).json({ exists });
}
