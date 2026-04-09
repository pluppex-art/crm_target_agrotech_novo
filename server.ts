import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization helpers
let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is missing");
    resendClient = new Resend(key);
  }
  return resendClient;
}

let supabaseAdminClient: any = null;
function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url && !key) throw new Error("Configuração do Supabase ausente: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontrados.");
    if (!url) throw new Error("Configuração do Supabase ausente: VITE_SUPABASE_URL não encontrado.");
    if (!key) throw new Error("Configuração do Supabase ausente: SUPABASE_SERVICE_ROLE_KEY não encontrado.");
    
    supabaseAdminClient = createClient(url, key);
  }
  return supabaseAdminClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Forgot Password via Resend
  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    console.log(`[DEBUG] Iniciando processo de recuperação para: ${email}`);

    try {
      const supabaseAdmin = getSupabaseAdmin();
      const resend = getResend();

      console.log(`[DEBUG] Gerando link de recuperação no Supabase...`);
      // 1. Gerar o link de recuperação usando o Supabase Admin
      const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${req.headers.origin}/reset-password`,
        }
      });

      if (linkError) {
        console.error(`[DEBUG] Erro ao gerar link no Supabase:`, linkError.message);
        if (linkError.message.includes('User with this email not found')) {
          return res.json({ success: true, message: "Se o e-mail existir, você receberá as instruções." });
        }
        throw linkError;
      }

      const recoveryLink = data.properties.action_link;
      console.log(`[DEBUG] Link gerado com sucesso. Enviando via Resend...`);

      // 2. Enviar o e-mail via Resend
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "Target Agrotech <onboarding@resend.dev>",
        to: email,
        subject: "Recuperação de Senha - Target Agrotech",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h1 style="color: #059669; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Recuperação de Senha</h1>
            <p style="color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
              Olá! Recebemos uma solicitação para redefinir a senha da sua conta no <b>Target Agrotech</b>.
            </p>
            <a href="${recoveryLink}" style="display: inline-block; background-color: #059669; color: white; font-weight: bold; padding: 12px 24px; border-radius: 12px; text-decoration: none; margin-bottom: 24px;">
              Redefinir Minha Senha
            </a>
            <p style="color: #94a3b8; font-size: 14px; line-height: 20px;">
              Se você não solicitou a alteração da senha, ignore este e-mail. O link expira em 1 hora.
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="color: #cbd5e1; font-size: 12px; text-align: center;">
              CRM v1.0.4 • Target Agrotech
            </p>
          </div>
        `,
      });

      if (emailError) {
        console.error(`[DEBUG] Erro no Resend:`, emailError);
        
        const isValidationError = (emailError as any).name === 'validation_error' || 
                                 (emailError as any).name === 'invalid_parameter' ||
                                 emailError.message?.includes('testing emails');

        // Se for erro de sandbox ou validação do Resend, não falhamos a requisição, apenas avisamos
        if (isValidationError) {
          console.warn(`[DEBUG] Resend em modo Sandbox ou Erro de Validação: E-mail não enviado para ${email}.`);
          return res.json({ 
            success: true, 
            message: "Aviso do Resend: O e-mail não pôde ser enviado (provavelmente devido ao modo Sandbox ou e-mail inválido).",
            debugLink: recoveryLink,
            isSandbox: true
          });
        }
        throw emailError;
      }

      console.log(`[DEBUG] E-mail enviado com sucesso! ID: ${emailData?.id}`);
      res.json({ 
        success: true, 
        debugLink: recoveryLink
      });
    } catch (error: any) {
      console.error('[DEBUG] Erro fatal no forgot-password:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // Resend Email API
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html } = req.body;

    try {
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: "Target Agrotech <onboarding@resend.dev>",
        to: to,
        subject: subject,
        html: html,
      });

      if (error) {
        console.error(`[DEBUG] Erro no Resend (send-email):`, error);
        const isValidationError = (error as any).name === 'validation_error' || 
                                 (error as any).name === 'invalid_parameter' ||
                                 error.message?.includes('testing emails');
        
        if (isValidationError) {
          return res.json({ 
            success: true, 
            message: "Aviso do Resend: E-mail não enviado (Sandbox ou Validação).",
            isSandbox: true 
          });
        }
        return res.status(400).json({ error });
      }

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mock API for Leads
  app.get("/api/leads", (req, res) => {
    // In a real app, this would fetch from a database
    res.json({ message: "Leads API ready" });
  });

  // Serve Vite assets in development
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
