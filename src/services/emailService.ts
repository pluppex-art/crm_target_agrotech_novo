import axios from 'axios';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  async sendEmail({ to, subject, html }: EmailParams) {
    try {
      const response = await axios.post('/api/send-email', {
        to,
        subject,
        html,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error sending email:', error.response?.data || error.message);
      throw error;
    }
  }
};
