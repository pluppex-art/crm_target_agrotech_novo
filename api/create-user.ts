import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email e password são obrigatórios.' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Configuração do Supabase ausente no servidor.' });
  }

  const supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ id: data.user?.id });
}
