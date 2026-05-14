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
      const status = error.response?.status;
      const detail = error.response?.data;
      if (status === 429 || detail?.error === 'quota_exceeded') {
        console.warn('[Email] Cota diária do MailerSend atingida — e-mail não enviado.');
        return { success: false, error: 'quota_exceeded' };
      }
      const msg = detail?.error || error.message || 'Falha desconhecida';
      console.warn('[Email] Falha ao enviar notificação por e-mail:', msg, detail?.details ?? '');
      return { success: false, error: msg };
    }
  }
};
