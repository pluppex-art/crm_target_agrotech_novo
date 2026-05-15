export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body ?? {};

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Campos obrigatórios: to, subject, html.' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY não configurada no servidor.' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Target Agrotech <crm@notificacoes.targetagrotech.com.br>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Resend API Error ${response.status}:`, JSON.stringify(errorData));
      return res.status(400).json({
        error: 'Erro ao enviar e-mail via Resend.',
        status: response.status,
        details: errorData,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Send Email Error:', error);
    return res.status(500).json({ error: 'Erro interno ao disparar e-mail.' });
  }
}
