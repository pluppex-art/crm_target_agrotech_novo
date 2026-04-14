import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, email, password } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'id é obrigatório.' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Configuração do Supabase ausente no servidor.' });
  }

  const supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const attrs: Record<string, any> = {};
  if (email) { attrs.email = email; attrs.email_confirm = true; }
  if (password) attrs.password = password;

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, attrs);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
