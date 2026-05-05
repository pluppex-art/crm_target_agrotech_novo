
export const emailTemplates = {
  /**
   * Design System Colors
   */
  colors: {
    primary: '#059669', // Emerald 600
    primaryLight: '#ecfdf5', // Emerald 50
    text: '#1e293b', // Slate 800
    textLight: '#64748b', // Slate 500
    bg: '#f8fafc', // Slate 50
    white: '#ffffff',
  },

  /**
   * Base Wrapper for all emails
   */
  wrapper: (content: string) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background-color: #059669; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">TARGET AGROTECH</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 32px;">
          ${content}
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
            © 2026 Target Agrotech • Tecnologia e Performance
          </p>
          <div style="margin-top: 12px;">
            <a href="#" style="color: #059669; text-decoration: none; font-size: 12px; font-weight: 700; margin: 0 8px;">Website</a>
            <a href="#" style="color: #059669; text-decoration: none; font-size: 12px; font-weight: 700; margin: 0 8px;">Suporte</a>
          </div>
        </div>
      </div>
    </div>
  `,

  /**
   * Template: Welcome for New Lead
   */
  newLeadWelcome: (name: string, product: string) => emailTemplates.wrapper(`
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 16px;">Olá, ${name}! 👋</h2>
    <p style="font-size: 16px; color: #475569; margin-bottom: 24px;">
      É um prazer receber seu interesse no nosso treinamento de <strong>${product}</strong>. Estamos muito felizes em poder te ajudar a decolar na sua carreira!
    </p>
    <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">O que acontece agora?</p>
      <p style="margin: 8px 0 0 0; color: #047857; font-size: 14px;">Um de nossos especialistas entrará em contato com você via WhatsApp em breve para tirar todas as suas dúvidas e passar os detalhes do curso.</p>
    </div>
    <p style="font-size: 16px; color: #475569;">
      Enquanto isso, sinta-se à vontade para nos acompanhar em nossas redes sociais.
    </p>
    <div style="margin-top: 32px; text-align: center;">
      <a href="#" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
        Falar com Consultor Agora
      </a>
    </div>
  `),

  /**
   * Template: Lead Transfer (To Seller)
   */
  leadAssignment: (sellerName: string, leadName: string, product: string) => emailTemplates.wrapper(`
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 16px;">Novo Lead Atribuído! 🚀</h2>
    <p style="font-size: 16px; color: #475569; margin-bottom: 24px;">
      Olá <strong>${sellerName}</strong>, um novo lead acaba de ser transferido para sua responsabilidade.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding-bottom: 12px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Lead</td>
          <td style="padding-bottom: 12px; color: #1e293b; font-size: 14px; font-weight: 700; text-align: right;">${leadName}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Interesse</td>
          <td style="padding-bottom: 12px; color: #1e293b; font-size: 14px; font-weight: 700; text-align: right;">${product}</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #64748b; font-style: italic;">
      Dica: Leads atendidos nos primeiros 15 minutos têm 70% mais chance de conversão.
    </p>
    <div style="margin-top: 32px; text-align: center;">
      <a href="https://crm-target-agrotech-novo.vercel.app/pipeline" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none;">
        Abrir CRM e Atender
      </a>
    </div>
  `),

  /**
   * Template: Enrollment Confirmation (To Client)
   */
  enrollmentConfirmed: (name: string, product: string, date: string, location: string) => emailTemplates.wrapper(`
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 48px; border-radius: 50%; padding: 20px; margin-bottom: 16px;">🎓</div>
      <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0;">Inscrição Confirmada!</h2>
    </div>
    <p style="font-size: 16px; color: #475569; text-align: center; margin-bottom: 32px;">
      Parabéns, <strong>${name}</strong>! Sua vaga no treinamento de <strong>${product}</strong> está garantida.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; margin-bottom: 32px;">
      <h3 style="color: #1e293b; font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.05em;">Detalhes do Treinamento</h3>
      <div style="margin-bottom: 12px; display: flex; align-items: center;">
        <span style="color: #059669; font-weight: bold; margin-right: 8px;">📅</span>
        <span style="color: #475569; font-size: 14px;"><strong>Data:</strong> ${date}</span>
      </div>
      <div style="margin-bottom: 12px; display: flex; align-items: center;">
        <span style="color: #059669; font-weight: bold; margin-right: 8px;">📍</span>
        <span style="color: #475569; font-size: 14px;"><strong>Local:</strong> ${location}</span>
      </div>
    </div>
    <p style="font-size: 14px; color: #64748b; text-align: center;">
      Prepare-se para uma experiência incrível. Em breve enviaremos o cronograma completo das aulas.
    </p>
  `),

  /**
   * Template: New Lead Internal Alert (To Seller/Responsible)
   */
  newLeadResponsible: (sellerName: string, leadName: string, product: string, origin: string) => emailTemplates.wrapper(`
    <div style="background-color: #ecfdf5; color: #059669; padding: 12px 20px; border-radius: 12px; font-size: 12px; font-weight: 800; text-transform: uppercase; display: inline-block; margin-bottom: 16px;">
      🔔 NOVO LEAD CHEGOU!
    </div>
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">Olá, ${sellerName}!</h2>
    <p style="font-size: 16px; color: #475569; margin-bottom: 24px;">
      Um novo potencial cliente acaba de entrar no seu funil. Confira os detalhes abaixo:
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding-bottom: 12px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Nome do Lead</td>
          <td style="padding-bottom: 12px; color: #1e293b; font-size: 14px; font-weight: 700; text-align: right;">${leadName}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Interesse</td>
          <td style="padding-bottom: 12px; color: #1e293b; font-size: 14px; font-weight: 700; text-align: right;">${product}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 0; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Origem</td>
          <td style="padding-bottom: 0; color: #1e293b; font-size: 14px; font-weight: 700; text-align: right;">${origin}</td>
        </tr>
      </table>
    </div>
    <div style="margin-top: 32px; text-align: center;">
      <a href="https://crm-target-agrotech-novo.vercel.app/pipeline" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none;">
        Acessar Funil e Atender
      </a>
    </div>
  `),
};
