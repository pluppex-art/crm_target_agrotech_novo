import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    // Backend deve usar variáveis próprias do servidor
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!url && !key) {
      throw new Error(
        "Configuração do Supabase ausente: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontrados."
      );
    }
    if (!url) {
      throw new Error("Configuração do Supabase ausente: SUPABASE_URL não encontrado.");
    }
    if (!key) {
      throw new Error(
        "Configuração do Supabase ausente: SUPABASE_SERVICE_ROLE_KEY não encontrado."
      );
    }

    supabaseAdminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminClient;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    console.log(`[DEBUG] Iniciando processo de recuperação para: ${email}`);

    try {
      if (!email) {
        return res.status(400).json({ error: "E-mail é obrigatório." });
      }

      const supabaseAdmin = getSupabaseAdmin();

      console.log(`[DEBUG] Gerando link de recuperação no Supabase...`);

      let origin = req.headers.origin || req.headers.referer || process.env.APP_URL || "http://localhost:5173";
      console.log(`[DEBUG] Origin detectado: ${origin}`);
      if (origin.endsWith('/')) origin = origin.slice(0, -1);
      // Ensure we don't have double /reset-password if referer was used
      if (origin.includes('/forgot-password')) origin = origin.split('/forgot-password')[0];
      if (origin.includes('/login')) origin = origin.split('/login')[0];
      console.log(`[DEBUG] Origin final para redirecionamento: ${origin}`);

      const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${origin}/reset-password`,
        },
      });

      if (linkError) {
        console.error(`[DEBUG] Erro ao gerar link no Supabase:`, linkError.message);

        if (linkError.message.includes("User with this email not found")) {
          return res.json({
            success: true,
            message: "Se o e-mail existir, você receberá as instruções.",
          });
        }

        throw linkError;
      }

      const recoveryLink = data?.properties?.action_link;

      if (!recoveryLink) {
        throw new Error("Não foi possível gerar o link de recuperação.");
      }

      const mailersendKey = process.env.MAILERSEND_API_KEY;
      if (!mailersendKey) {
        throw new Error("MAILERSEND_API_KEY não encontrado.");
      }

      console.log(`[DEBUG] Link gerado com sucesso. Enviando via MailerSend...`);

      const emailResponse = await fetch('https://api.mailersend.com/v1/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${mailersendKey}`
        },
        body: JSON.stringify({
          from: {
            email: "crm@notificacoes.targetagrotech.com.br",
            name: "Target Agrotech"
          },
          to: [{ email: email }],
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

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('[DEBUG] Erro no MailerSend:', errorData);
        throw new Error("Erro ao enviar e-mail via MailerSend.");
      }

      console.log(`[DEBUG] E-mail enviado com sucesso!`);
      return res.json({
        success: true,
        debugLink: recoveryLink,
      });
    } catch (error: any) {
      console.error("[DEBUG] Erro fatal no forgot-password:", error.message);
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html } = req.body;

    try {
      if (!to || !subject || !html) {
        return res.status(400).json({
          error: "Campos obrigatórios: to, subject, html",
        });
      }

      const mailersendKey = process.env.MAILERSEND_API_KEY;
      if (!mailersendKey) {
        throw new Error("MAILERSEND_API_KEY não encontrado.");
      }

      const response = await fetch('https://api.mailersend.com/v1/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${mailersendKey}`
        },
        body: JSON.stringify({
          from: {
            email: "crm@notificacoes.targetagrotech.com.br",
            name: "Target Agrotech"
          },
          to: [{ email: to }],
          subject: subject,
          html: html
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[DEBUG] Erro no MailerSend (send-email):', errorData);
        return res.status(400).json({ error: "Erro ao enviar e-mail via MailerSend." });
      }

      const data = await response.json();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/leads", (req, res) => {
    res.json({ message: "Leads API ready" });
  });

  // Create auth user (requires service role)
  app.post("/api/create-user", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      if (!email || !password) {
        return res.status(400).json({ error: "email e password são obrigatórios." });
      }
      const supabaseAdmin = getSupabaseAdmin();
      const cleanEmail = email.trim().toLowerCase();

      let { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (error) {
        console.warn(`[create-user] Tentativa 1 falhou para ${cleanEmail}:`, JSON.stringify(error, null, 2));

        // Se falhou com 500, tenta sem metadata (pode ser trigger quebrando)
        if (error.status === 500 || error.code === 'unexpected_failure') {
          console.log(`[create-user] Tentando criar sem metadata para ${cleanEmail}...`);
          const retry = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true
          });
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        console.warn(`[create-user] Criar usuário falhou definitivamente para ${cleanEmail}:`, JSON.stringify(error, null, 2));

        // Sempre tenta buscar o usuário existente quando há qualquer erro
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

        if (!listError && listData?.users) {
          const existingUser = listData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (existingUser) {
            console.log(`[create-user] Usuário encontrado com ID existente: ${existingUser.id}`);
            return res.status(200).json({ id: existingUser.id });
          }
        }

        // Se realmente não existe, retorna o erro original
        console.error("[create-user] Usuário não encontrado após busca. Erro original:", error.message);
        return res.status(400).json({ error: error.message });
      }
      return res.json({ id: data.user?.id });
    } catch (err: any) {
      console.error("[create-user] Erro fatal:", err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Update auth user email/password (requires service role)
  app.post("/api/update-user", async (req, res) => {
    const { id, email, password } = req.body;
    try {
      if (!id) {
        return res.status(400).json({ error: "id é obrigatório." });
      }
      const supabaseAdmin = getSupabaseAdmin();
      const attrs: Record<string, any> = {};
      if (email) { attrs.email = email; attrs.email_confirm = true; }
      if (password) attrs.password = password;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, attrs);
      if (error) {
        console.error("[update-user] Erro:", error.message);
        return res.status(400).json({ error: error.message });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error("[update-user] Erro fatal:", err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Delete auth user (requires service role)
  app.post("/api/delete-user", async (req, res) => {
    const { id } = req.body;
    try {
      if (!id) {
        return res.status(400).json({ error: "id é obrigatório." });
      }
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) {
        console.error("[delete-user] Erro:", error.message);
        return res.status(400).json({ error: error.message });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error("[delete-user] Erro fatal:", err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();