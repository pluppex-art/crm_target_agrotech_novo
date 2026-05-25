import express from "express";
import path from "path";
import { fileURLToPath } from "url";
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
          redirectTo: `https://crm.targetagrotech.com.br/reset-password`,
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

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        throw new Error("RESEND_API_KEY não encontrado.");
      }

      console.log(`[DEBUG] Link gerado com sucesso. Enviando via Resend...`);

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: "Target Agrotech <crm@notificacoes.targetagrotech.com.br>",
          to: [email],
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
        const errorData = await emailResponse.json().catch(() => ({}));
        console.error('[DEBUG] Erro no Resend:', errorData);
        throw new Error("Erro ao enviar e-mail via Resend.");
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

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        throw new Error("RESEND_API_KEY não encontrado.");
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: "Target Agrotech <crm@notificacoes.targetagrotech.com.br>",
          to: [to],
          subject: subject,
          html: html
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          console.warn('[Resend] Cota atingida — e-mail não enviado.');
          return res.status(429).json({ error: 'quota_exceeded', message: errorData.message ?? 'Quota exceeded' });
        }
        console.error('[Resend] Erro ao enviar e-mail:', JSON.stringify(errorData));
        return res.status(400).json({ error: 'Erro ao enviar e-mail via Resend.', details: errorData });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/submit-lead", async (req, res) => {
    const { name, email, phone, city, product, value, interest, notes: extraNotes } = req.body ?? {};

    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Campos obrigatórios: Nome, E-mail e Telefone.' });
    }

    try {
      const supabase = getSupabaseAdmin() as any;
      const PIPELINE_ID = '31f2fdbb-7b19-4973-8f70-7bb629697f11';
      const STAGE_ID = '36f5f922-ac1d-4742-a2b5-43a9af25b37d';

      // 1. Obter o estado atual do rodízio para ler o last_seller_id
      const { data: rrState } = await supabase
        .from('round_robin_state')
        .select('last_seller_id')
        .eq('id', 'form_leads')
        .single();

      let lastSellerId: string | null = rrState?.last_seller_id ?? null;
      let targetRoleId: string | null = null;

      if (lastSellerId) {
        // 2. Busca o perfil do último vendedor do rodízio para obter seu role_id
        const { data: lastProfile } = await supabase
          .from('perfis')
          .select('role_id')
          .eq('id', lastSellerId)
          .single();
        if (lastProfile?.role_id) {
          targetRoleId = lastProfile.role_id;
        }
      }

      // 3. Busca todos os vendedores ativos que pertencem a esse cargo ou que estão no rodízio
      let sellersQuery = supabase
        .from('perfis')
        .select('id, name, phone, department, role_id')
        .eq('status', 'active')
        .neq('in_round_robin', false);

      if (targetRoleId) {
        sellersQuery = sellersQuery.eq('role_id', targetRoleId);
      } else {
        // Fallback robusto se for primeira execução ou sem last_seller_id
        sellersQuery = sellersQuery.or('department.ilike.%comercial%,in_round_robin.eq.true');
      }

      const { data: sellers, error: sellersErr } = await sellersQuery;

      if (sellersErr) console.error('[submit-lead] Erro ao buscar sellers:', sellersErr.message);
      console.log('[submit-lead] Sellers encontrados:', (sellers || []).length,
        sellers?.map((s: any) => `${s.name} (${s.department}) [${s.id}]`));

      // 4. Fetch the product routing preferences
      const { data: rrSettings } = await supabase
        .from('crm_settings')
        .select('value')
        .eq('key', 'round_robin_products')
        .maybeSingle();

      const productRouting = (rrSettings?.value as Record<string, string[]>) || {};

      const validSellers = (sellers || [])
        .filter((s: any) => {
          const allowedProducts = productRouting[s.id];
          if (!allowedProducts || allowedProducts.length === 0) return true;
          if (!product) return true;
          return allowedProducts.some(p => 
            product.toLowerCase().includes(p.toLowerCase()) || 
            p.toLowerCase().includes(product.toLowerCase())
          );
        })
        .sort((a: any, b: any) =>
          a.name.trim().localeCompare(b.name.trim(), 'pt-BR', { sensitivity: 'base' })
        );

      if (validSellers.length === 0) {
        return res.status(500).json({ error: 'Nenhum consultor disponível para atribuição. Verifique os cadastros.' });
      }

      let lastIndex = lastSellerId
        ? validSellers.findIndex((s: any) => s.id === lastSellerId)
        : -1;

      // Se o último vendedor geral não faz parte da lista deste produto (ex: pools separados),
      // buscamos quem foi o último desta lista específica a receber um lead.
      if (lastIndex === -1) {
        const { data: lastLead } = await supabase
          .from('leads')
          .select('responsavel_usuario_id')
          .in('responsavel_usuario_id', validSellers.map((s: any) => s.id))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (lastLead?.responsavel_usuario_id) {
          lastIndex = validSellers.findIndex((s: any) => s.id === lastLead.responsavel_usuario_id);
        }
      }

      const nextIndex = (lastIndex !== -1 ? lastIndex + 1 : 0) % validSellers.length;
      const assignedSeller = validSellers[nextIndex];

      console.log(`[submit-lead] Atribuindo a: ${assignedSeller.name} (${assignedSeller.department}) [${assignedSeller.id}]`);

      const assignedResponsible = assignedSeller.name;
      const assignedUserId: string = assignedSeller.id;
      const assignedPhone = assignedSeller.phone;

      // Buscar centro de custo 'cursos' para obter o ID estrutural
      const { data: ccCursos } = await supabase
        .from('centro_custos')
        .select('id')
        .ilike('nome', 'cursos')
        .maybeSingle();
      const centroCustoId = ccCursos?.id || null;

      // 2. Insert Lead
      const notesContent = [
        interest ? `Área de Interesse: ${interest}` : null,
        extraNotes ? `Notas: ${extraNotes}` : null
      ].filter(Boolean).join('\n');

      const leadPayload: Record<string, any> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city: city?.trim() ?? null,
        product: product?.trim() ?? null,
        pipeline_id: PIPELINE_ID,
        stage_id: STAGE_ID,
        status: 'new',
        responsible: assignedResponsible,
        responsavel_usuario_id: assignedUserId,
        stars: 1,
        value: Number(value) || 0,
        substatus: 'qualified',
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=059669&color=fff&size=128`,
        seller_origin: 'target',
        cost_center: 'cursos',
        centro_custo_id: centroCustoId
      };

      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert([leadPayload])
        .select()
        .single();

      if (leadError) throw leadError;

      // 3. Update RR State por ID
      await supabase
        .from('round_robin_state')
        .upsert({
          id: 'form_leads',
          last_seller_id: assignedUserId,
          last_seller_name: assignedResponsible,
          updated_at: new Date().toISOString()
        });

      // 4. In-app notification for the assigned seller
      if (assignedUserId && leadData) {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const notifTitle = `Novo lead: ${name.trim()}`;
        const { data: existing } = await supabase
          .from('notifications').select('id')
          .eq('user_id', assignedUserId).eq('title', notifTitle)
          .gte('created_at', since24h).limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert([{
            user_id: assignedUserId,
            read: false,
            title: notifTitle,
            message: `Novo lead do formulário. Produto: ${product || 'Interesse Geral'} | Tel: ${phone.trim()}`,
            type: 'info',
            category: 'user',
            link: `/pipeline?lead=${leadData.id}`,
          }]);
        }
      }

      // 5. Email Notification
      const resendKey = process.env.RESEND_API_KEY;
      if (assignedUserId && resendKey) {
        const { data: sellerProfile } = await supabase
          .from('perfis')
          .select('email, name')
          .eq('id', assignedUserId)
          .maybeSingle();

        if (sellerProfile?.email) {
          const html = `
            <div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;">
              <h2 style="color:#059669;">🔔 NOVO LEAD CHEGOU!</h2>
              <p>Olá <b>${sellerProfile.name}</b>, um novo lead acabou de entrar no seu funil:</p>
              <ul>
                <li><b>Nome:</b> ${name.trim()}</li>
                <li><b>Produto:</b> ${product || 'Interesse Geral'}</li>
                <li><b>Origem:</b> Formulário Público</li>
              </ul>
              <a href="https://crm.targetagrotech.com.br/pipeline" style="display:inline-block;padding:10px 20px;background:#059669;color:white;text-decoration:none;border-radius:5px;">Ver no CRM</a>
            </div>
          `;
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${resendKey}` 
            },
            body: JSON.stringify({
              from: "Target Agrotech <crm@notificacoes.targetagrotech.com.br>",
              to: [sellerProfile.email],
              subject: `🔔 Novo Lead: ${name.trim()}`,
              html
            })
          });

          if (!emailRes.ok) {
            const errorData = await emailRes.json().catch(() => ({}));
            console.error('[Resend Error] Falha ao enviar notificação:', JSON.stringify(errorData));
          } else {
            console.log(`[Resend] Notificação enviada para ${sellerProfile.email}`);
          }
        }
      }

      // 6. Create Note
      if (notesContent && leadData) {
        await supabase.from('notes').insert([{ content: notesContent, lead_id: leadData.id, author_name: 'Sistema' }]);
      }

      return res.json({ success: true, id: leadData?.id, responsibleName: assignedResponsible, responsiblePhone: assignedPhone });
    } catch (err: any) {
      console.error('Submit lead error:', err);
      return res.status(500).json({ error: err.message });
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