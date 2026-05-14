import axios from 'axios';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  /**
   * Envia um e-mail através da API interna do sistema.
   * Isso evita expor a chave do MailerSend no front-end.
   */
  async sendEmail({ to, subject, html }: EmailParams) {
    try {
      const response = await axios.post('/api/send-email', {
        to,
        subject,
        html
      });

      return { success: true, data: response.data };
    } catch (error: any) {
      const detail = error.response?.data;
      const msg = detail?.error || error.message || 'Falha desconhecida';
      const isQuota = typeof msg === 'string' && msg.toLowerCase().includes('quota');
      if (isQuota) {
        console.warn('[Email] Limite diário do MailerSend atingido — e-mail não enviado.');
      } else {
        console.warn('[Email] Falha ao enviar notificação por e-mail:', msg, detail?.details ?? '');
      }
      return { success: false, error: msg };
    }
  }
};
