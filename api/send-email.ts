export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body ?? {};

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Campos obrigatórios: to, subject, html.' });
  }

  const mailersendKey = process.env.MAILERSEND_API_KEY;
  if (!mailersendKey) {
    return res.status(500).json({ error: 'Configuração do servidor ausente.' });
  }

  try {
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': `Bearer ${mailersendKey}`,
      },
      body: JSON.stringify({
        from: {
          email: 'crm@notificacoes.targetagrotech.com.br',
          name: 'Target Agrotech',
        },
        to: [{ email: to }],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('MailerSend Error:', errorData);
      return res.status(400).json({ error: 'Erro ao enviar e-mail via MailerSend.' });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Send Email Error:', error);
    return res.status(500).json({ error: 'Erro interno ao disparar e-mail.' });
  }
}
