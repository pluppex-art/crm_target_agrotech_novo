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
      console.error('Erro ao enviar e-mail via API interna:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  }
};
