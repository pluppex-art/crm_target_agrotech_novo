import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};
  const { id, email, password, name } = body;

  if (!id) {
    return res.status(400).json({ error: 'id é obrigatório.' });
  }

  // Evita aceitar payloads claramente inválidos
  if (password !== undefined && password !== null && typeof password !== 'string') {
    return res.status(400).json({ error: 'password deve ser uma string.' });
  }
  if (email !== undefined && email !== null && typeof email !== 'string') {
    return res.status(400).json({ error: 'email deve ser uma string.' });
  }
  if (name !== undefined && name !== null && typeof name !== 'string') {
    return res.status(400).json({ error: 'name deve ser uma string.' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Configuração do Supabase ausente no servidor.' });
  }

  const supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Monta attrs com cuidado. Não incluímos campos quando não vierem.
  const attrs: Record<string, any> = {};
  if (email) {
    attrs.email = email;
    attrs.email_confirm = true;
  }

  // Evita 400 do Supabase por senha curta
  // Se password vier vazia/null/undefined: não atualiza.
  // Se vier menor que 6: falha cedo.
  if (password !== undefined && password !== null) {
    const pwd = typeof password === 'string' ? password.trim() : '';
    if (!pwd) {
      // não atualiza password
    } else if (pwd.length < 6) {
      return res.status(400).json({
        error: 'password deve ter pelo menos 6 caracteres.',
        details: { minLength: 6 },
      });
    } else {
      attrs.password = pwd;
    }
  }



  if (name !== undefined) {
    attrs.user_metadata = { name };
  }


  // Logs sanitizados para debugar 400s sem expor password
  console.log('[api/update-user] payload', {
    id,
    hasEmail: Boolean(email),
    hasPassword: Boolean(password),
    nameProvided: name !== undefined,
  });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, attrs);

  if (error) {
    console.error('[api/update-user] supabase error', {
      message: error.message,
      // Supabase errors podem ter status/code; quando existir, ajuda no diagnóstico
      status: (error as any)?.status,
      code: (error as any)?.code,
    });

    return res.status(400).json({
      error: error.message,
      details: {
        status: (error as any)?.status,
        code: (error as any)?.code,
      },
    });
  }

  return res.status(200).json({ success: true });
}

