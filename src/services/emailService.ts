import axios from 'axios';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  async sendEmail({ to, subject, html }: EmailParams) {
    const apiKey = import.meta.env.VITE_MAILERSEND_API_KEY;
    
    if (!apiKey) {
      console.error('MailerSend API Key not found in environment variables');
      return { success: false, error: 'API Key missing' };
    }

    try {
      const response = await axios.post('https://api.mailersend.com/v1/email', {
        from: {
          email: "crm@notificacoes.targetagrotech.com.br", // E-mail verificado no MailerSend
          name: "Target Agrotech"
        },
        to: [
          {
            email: to
          }
        ],
        subject: subject,
        html: html
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Error sending email via MailerSend:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }
};
