import { createClient } from '@supabase/supabase-js';


export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { emailAccount, emailToReceive } = req.body;

  // mantém compatibilidade: se alguém ainda enviar apenas { email }
  // (caso exista deploy anterior do front), fallback evita quebra total.
  const accountEmail = emailAccount || req.body?.email;
  const receiveEmail = emailToReceive || req.body?.email;


  if (!emailAccount) {
    return res.status(400).json({ error: 'E-mail da conta é obrigatório.' });
  }

  if (!emailToReceive) {
    return res.status(400).json({ error: 'E-mail para receber é obrigatório.' });
  }


  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!url || !key || !resendKey) {
    return res.status(500).json({ error: 'Configuração do servidor ausente.' });
  }

  const supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let origin = req.headers.origin || req.headers.referer || process.env.APP_URL || 'https://crm.targetagrotech.com.br';
  if (origin.endsWith('/')) origin = origin.slice(0, -1);
  if (origin.includes('/forgot-password')) origin = origin.split('/forgot-password')[0];
  if (origin.includes('/login')) origin = origin.split('/login')[0];

  const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: accountEmail,
    options: { redirectTo: `https://crm.targetagrotech.com.br/reset-password` },
  });


  // Importante: não expor detalhes do erro (para segurança)
  // Além disso, quando houver falha ao gerar o link (ex.: e-mail inválido/ não entregue),
  // a gente ainda responde success para que o usuário entenda que pode tentar novamente.
  if (linkError) {
    // caso: e-mail não existe
    if (linkError.message?.includes('User with this email not found')) {
      return res.status(200).json({ success: true, message: 'Se o e-mail existir, você receberá as instruções.' });
    }

    // caso geral: não falhar o fluxo do usuário
      console.error('[forgot-password] generateLink error:', {
      	message: linkError.message,
      	code: (linkError as any)?.code,
      	accountEmail,
      });


    return res.status(200).json({
      success: true,
      message: 'Se o e-mail estiver cadastrado, você receberá as instruções.'
    });
  }

  const recoveryLink = data?.properties?.action_link;
  if (!recoveryLink) {
    return res.status(500).json({ error: 'Não foi possível gerar o link de recuperação.' });
  }

  // Use Resend API via fetch
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: "Target Agrotech <crm@notificacoes.targetagrotech.com.br>",
        to: [receiveEmail],

        subject: 'Recuperação de Senha - Target Agrotech',
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:16px;">
            <h1 style="color:#059669;font-size:24px;font-weight:bold;margin-bottom:16px;">Recuperação de Senha</h1>
            <p style="color:#475569;font-size:16px;line-height:24px;margin-bottom:24px;">
              Olá! Recebemos uma solicitação para redefinir a senha da sua conta no <b>Target Agrotech</b>.
            </p>
            <a href="${recoveryLink}" style="display:inline-block;background-color:#059669;color:white;font-weight:bold;padding:12px 24px;border-radius:12px;text-decoration:none;margin-bottom:24px;">
              Redefinir Minha Senha
            </a>
            <p style="color:#94a3b8;font-size:14px;line-height:20px;">
              Se você não solicitou a alteração da senha, ignore este e-mail. O link expira em 1 hora.
            </p>
            <hr style="border:0;border-top:1px solid #f1f5f9;margin:24px 0;">
            <p style="color:#cbd5e1;font-size:12px;text-align:center;">CRM v1.0.4 • Target Agrotech</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Resend Error:', { status: response.status, errorData });
      return res.status(response.status).json({
        error: 'Erro ao enviar e-mail via Resend.',
        status: response.status,
        details: errorData,
        message: errorData?.message || errorData?.error || undefined,
      });
    }


    return res.status(200).json({ success: true, debugLink: recoveryLink });
  } catch (error: any) {
    console.error('Fetch Error:', error);
    return res.status(500).json({ error: 'Erro interno ao disparar e-mail.' });
  }
}
