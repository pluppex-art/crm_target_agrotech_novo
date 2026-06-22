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

  app.post("/api/check-lead", async (req, res) => {
    const { phone, email } = req.body ?? {};
    try {
      const supabase = getSupabaseAdmin() as any;
      let exists = false;

      if (phone) {
        const normalizedPhone = phone.trim().replace(/\D/g, '');
        if (normalizedPhone.length >= 10) {
          const { data } = await supabase
            .from('leads')
            .select('id')
            .or(`phone.ilike.%${normalizedPhone}%,phone.eq.${phone.trim()}`)
            .limit(1)
            .maybeSingle();
          if (data) exists = true;
        }
      }

      if (!exists && email && email.trim()) {
        const { data } = await supabase
          .from('leads')
          .select('id')
          .ilike('email', email.trim())
          .limit(1)
          .maybeSingle();
        if (data) exists = true;
      }

      return res.json({ exists });
    } catch (err: any) {
      console.error('Check lead error:', err);
      return res.json({ exists: false });
    }
  });

  app.post("/api/submit-lead", async (req, res) => {
    const { name, email, phone, city, product: rawProduct, value, interest, notes: extraNotes } = req.body ?? {};

    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Campos obrigatórios: Nome, E-mail e Telefone.' });
    }

    try {
      const supabase = getSupabaseAdmin() as any;

      let product = rawProduct;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (product && typeof product === 'string' && uuidRegex.test(product)) {
        const { data: prodData } = await supabase.from('turmas').select('name').eq('id', product).maybeSingle();
        if (prodData?.name) {
          product = prodData.name;
        }
      }

      const PIPELINE_ID = '31f2fdbb-7b19-4973-8f70-7bb629697f11';
      const STAGE_ID = '36f5f922-ac1d-4742-a2b5-43a9af25b37d';

      // 1. Obter o estado atual do rodízio para ler o last_seller_id
      const { data: rrState } = await supabase
        .from('round_robin_state')
        .select('last_seller_id')
        .eq('id', 'form_leads')
        .single();

      let lastSellerId: string | null = rrState?.last_seller_id ?? null;

      // 3. Busca todos os vendedores ativos no departamento comercial e no rodízio
      const { data: sellers, error: sellersErr } = await supabase
        .from('perfis')
        .select('id, name, phone, department, role_id')
        .eq('status', 'active')
        .ilike('department', 'comercial')
        .neq('in_round_robin', false);

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

      let validSellers = (sellers || [])
        .filter((s: any) => {
          const allowedProducts = productRouting[s.id];
          if (!allowedProducts || allowedProducts.length === 0) return true;
          if (!product) return true;
          
          const productStr = String(product).toLowerCase();
          
          return allowedProducts.some(p => {
            const pStr = p.toLowerCase();
            if (productStr.includes(pStr) || pStr.includes(productStr)) return true;
            
            // Keyword matching to bridge "Curso de Drone" with "🚁 Drone, Altamira..."
            if (pStr.includes('drone') && productStr.includes('drone')) return true;
            if ((pStr.includes('ia') || pStr.includes('inseminação') || pStr.includes('inseminacao')) && 
                (productStr.includes('ia') || productStr.includes('inseminação') || productStr.includes('inseminacao'))) return true;

            return false;
          });
        })
        .sort((a: any, b: any) =>
          (a.name || '').trim().localeCompare((b.name || '').trim(), 'pt-BR', { sensitivity: 'base' })
        );

      if (validSellers.length === 0 && sellers && sellers.length > 0) {
        validSellers = sellers.sort((a: any, b: any) => (a.name || '').trim().localeCompare((b.name || '').trim(), 'pt-BR', { sensitivity: 'base' }));
      }

      if (validSellers.length === 0) {
        const { data: fallbackSellers } = await supabase.from('perfis').select('id, name, phone, department, role_id').eq('status', 'active').limit(1);
        if (fallbackSellers && fallbackSellers.length > 0) {
          validSellers = fallbackSellers as any[];
        } else {
          return res.status(500).json({ error: 'Nenhum consultor disponível para atribuição. Verifique os cadastros.' });
        }
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


      // ── Upsert: check for existing lead by phone or email ────────────────────
      const normalizedPhoneForCheck = phone.trim().replace(/\D/g, '');
      let existingLeadId = null;
      let existingResponsible = null;
      let existingUserId = null;

      if (normalizedPhoneForCheck.length >= 10) {
        const { data: byPhone } = await supabase
          .from('leads')
          .select('id, responsible, responsavel_usuario_id')
          .or(`phone.ilike.%${normalizedPhoneForCheck}%,phone.eq.${phone.trim()}`)
          .limit(1)
          .maybeSingle();
        if (byPhone) {
          existingLeadId = byPhone.id;
          existingResponsible = byPhone.responsible;
          existingUserId = byPhone.responsavel_usuario_id;
        }
      }

      if (!existingLeadId && email.trim()) {
        const { data: byEmail } = await supabase
          .from('leads')
          .select('id, responsible, responsavel_usuario_id')
          .ilike('email', email.trim())
          .limit(1)
          .maybeSingle();
        if (byEmail) {
          existingLeadId = byEmail.id;
          existingResponsible = byEmail.responsible;
          existingUserId = byEmail.responsavel_usuario_id;
        }
      }

      // ── If lead already exists: UPDATE and return ────────────────────────────
      if (existingLeadId) {
        const updatePayload: any = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          city: city?.trim() ?? null,
          product: product?.trim() ?? null,
        };

        if (!existingUserId && assignedUserId) {
          updatePayload.responsavel_usuario_id = assignedUserId;
          updatePayload.responsible = assignedResponsible;

          const { data: squadData } = await supabase
            .from('squad_members')
            .select('squad_id, squads(company)')
            .eq('user_id', assignedUserId)
            .maybeSingle();
          const comp = (squadData?.squads as any)?.company;
          if (comp === 'pluppex' || comp === 'target') {
            updatePayload.seller_origin = comp;
          }
        }

        const { error: updateError } = await supabase
          .from('leads')
          .update(updatePayload)
          .eq('id', existingLeadId);

        if (updateError) throw updateError;

        if (notesContent) {
          await supabase.from('notes').insert([{
            content: `[Atualização via Formulário]\n${notesContent}`,
            lead_id: existingLeadId,
            author_name: 'Sistema',
          }]);
        }

        return res.json({ success: true, id: existingLeadId, responsibleName: existingResponsible || assignedResponsible, responsiblePhone: null });
      }


      let sellerOrigin: 'target' | 'pluppex' = 'target';
      if (assignedUserId) {
        const { data: squadData } = await supabase
          .from('squad_members')
          .select('squad_id, squads(company)')
          .eq('user_id', assignedUserId)
          .maybeSingle();
        const comp = (squadData?.squads as any)?.company;
        if (comp === 'pluppex' || comp === 'target') {
          sellerOrigin = comp;
        }
      }

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
        value: Number(value) || 197,
        substatus: 'qualified',
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=059669&color=fff&size=128`,
        seller_origin: sellerOrigin,
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

  // Public endpoint — returns form config by key (drone | ia)
  app.get("/api/form-config/:key", async (req, res) => {
    const { key } = req.params;
    const defaults: Record<string, object> = {
      drone: { form_key: 'drone', title: 'Formulário Drone Agrícola', product: 'Curso de Piloto de Drone Agrícola', price: 197, whatsapp_number: '5566999763455', badge_label: 'Drone', active: true },
      ia:    { form_key: 'ia',    title: 'Formulário Inseminação Artificial', product: 'Curso de Inseminação Artificial em Bovinos', price: 197, whatsapp_number: '5566999763455', badge_label: 'IA', active: true },
    };
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data } = await supabase
        .from('form_configs')
        .select('*')
        .eq('form_key', key)
        .maybeSingle();
      return res.json(data ?? defaults[key] ?? null);
    } catch {
      return res.json(defaults[key] ?? null);
    }
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

  // Deactivate user: sets status inactive, removes from round-robin, redistributes open leads
  app.post("/api/deactivate-user", async (req, res) => {
    const { id } = req.body;
    try {
      if (!id) {
        return res.status(400).json({ error: "id é obrigatório." });
      }
      const supabaseAdmin = getSupabaseAdmin() as any;

      // 1. Remove user from round-robin
      await supabaseAdmin
        .from('perfis')
        .update({ in_round_robin: false })
        .eq('id', id);

      // 2. Get all open leads assigned to this user (not won/lost/cancelled)
      const TERMINAL_STATUSES = ['ganho', 'perdido', 'cancelado', 'fechado', 'won', 'lost'];
      const { data: openLeads } = await supabaseAdmin
        .from('leads')
        .select('id, name, product')
        .eq('responsavel_usuario_id', id)
        .not('status', 'in', `(${TERMINAL_STATUSES.map(s => `"${s}"`).join(',')})`);

      if (!openLeads || openLeads.length === 0) {
        return res.json({ success: true, redistributed: 0 });
      }

      // 3. Get active sellers in round-robin (excluding deactivated user)
      const { data: sellers } = await supabaseAdmin
        .from('perfis')
        .select('id, name')
        .eq('status', 'active')
        .neq('in_round_robin', false)
        .neq('id', id);

      if (!sellers || sellers.length === 0) {
        return res.json({ success: true, redistributed: 0, warning: 'Nenhum vendedor disponível para redistribuição.' });
      }

      // 4. Distribute leads round-robin style
      let sellerIndex = 0;
      for (const lead of openLeads) {
        const seller = sellers[sellerIndex % sellers.length];
        sellerIndex++;

        await supabaseAdmin
          .from('leads')
          .update({ responsavel_usuario_id: seller.id, responsible: seller.name })
          .eq('id', lead.id);

        await supabaseAdmin.from('notifications').insert({
          user_id: seller.id,
          read: false,
          title: `Lead redistribuído: ${lead.name}`,
          message: `O lead foi redistribuído para você após desativação do responsável anterior.`,
          type: 'info',
          category: 'user',
          link: `/pipeline?lead=${lead.id}`,
        });
      }

      console.log(`[deactivate-user] ${openLeads.length} leads redistribuídos de ${id} para ${sellers.length} vendedores.`);
      return res.json({ success: true, redistributed: openLeads.length });
    } catch (err: any) {
      console.error("[deactivate-user] Erro fatal:", err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Delete lead with cascade (requires service role)
  app.post("/api/delete-lead", async (req, res) => {
    const { id } = req.body;
    try {
      if (!id) {
        return res.status(400).json({ error: "id é obrigatório." });
      }
      const supabaseAdmin = getSupabaseAdmin() as any;

      const { data: matriculas } = await supabaseAdmin.from('matriculas').select('id').eq('lead_id', id);
      if (matriculas && matriculas.length > 0) {
        const matriculaIds = matriculas.map((m: any) => m.id);
        await supabaseAdmin.from('pagamentos_matriculas').delete().in('matricula_id', matriculaIds);
      }

      // Execute independent deletes in parallel to save time
      await Promise.all([
        supabaseAdmin.from('vendas').delete().eq('lead_id', id),
        supabaseAdmin.from('financial_transactions').delete().eq('lead_id', id),
        supabaseAdmin.from('call_logs').delete().eq('lead_id', id),
        supabaseAdmin.from('tasks').delete().eq('lead_id', id),
        supabaseAdmin.from('notes').delete().eq('lead_id', id)
      ]);

      // Delete the tables that are referenced by other things, in safe order
      await supabaseAdmin.from('matriculas').delete().eq('lead_id', id);
      await supabaseAdmin.from('lead_class_enrollments').delete().eq('lead_id', id);

      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      const deleteResp = await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey!,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      });

      if (!deleteResp.ok) {
        const errBody = await deleteResp.text();
        console.error(`[delete-lead] REST API error ${deleteResp.status}:`, errBody);
        return res.status(400).json({ error: `Erro ao excluir lead (HTTP ${deleteResp.status}): ${errBody}` });
      }

      const deletedRows = await deleteResp.json();
      console.log(`[delete-lead] id=${id} | deletedRows=${JSON.stringify(deletedRows)}`);

      if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
        const checkResp = await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${id}&select=id`, {
          headers: {
            'apikey': serviceKey!,
            'Authorization': `Bearer ${serviceKey}`,
          },
        });
        const checkData = await checkResp.json();
        if (Array.isArray(checkData) && checkData.length > 0) {
          console.error("[delete-lead] Lead ainda existe após DELETE — bloqueio inesperado.");
          return res.status(500).json({ error: "Lead não pôde ser excluído. Possível bloqueio de RLS no banco de dados." });
        }
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[delete-lead] Erro fatal:", err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── CRM API Contract ────────────────────────────────────────────────────────
  // Authorization: Bearer TARGET_API_KEY required on all /api/crm/* routes

  function crmAuth(req: any, res: any, next: () => void) {
    const expectedToken = process.env.TARGET_API_KEY;
    if (!expectedToken) {
      return res.status(500).json({ error: 'TARGET_API_KEY não configurada no servidor.' });
    }
    const authHeader = req.headers['authorization'] as string | undefined;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization: Bearer {token} obrigatório.' });
    }
    const token = authHeader.slice(7).trim();
    if (token !== expectedToken) {
      return res.status(403).json({ error: 'Token inválido.' });
    }
    next();
  }

  // GET /api/crm/leads
  // Lista todos os leads com estágio, pipeline, responsável e produto
  app.get('/api/crm/leads', crmAuth, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id, name, email, phone, city, product, value, status, substatus,
          responsible, responsavel_usuario_id,
          stars, lead_source, seller_origin, cost_center,
          pix_completed, contract_signed, motivo_perda,
          created_at, updated_at, last_contact_at,
          pipeline_stages!leads_stage_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({
        data: (data || []).map((l: any) => ({
          id: l.id,
          nome: l.name,
          email: l.email ?? null,
          telefone: l.phone ?? null,
          cidade: l.city ?? null,
          produto: l.product ?? null,
          valor: Number(l.value) || 0,
          status: l.status ?? null,
          substatus: l.substatus ?? null,
          estagio: l.pipeline_stages?.name ?? null,
          responsavel: l.responsible ?? null,
          responsavel_id: l.responsavel_usuario_id ?? null,
          estrelas: l.stars ?? null,
          origem: l.lead_source ?? null,
          empresa_origem: l.seller_origin ?? null,
          centro_custo: l.cost_center ?? null,
          pix_pago: l.pix_completed ?? false,
          contrato_assinado: l.contract_signed ?? false,
          motivo_perda: l.motivo_perda ?? null,
          criado_em: l.created_at,
          atualizado_em: l.updated_at ?? null,
          ultimo_contato: l.last_contact_at ?? null,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/crm/turmas
  // Lista turmas (cursos/aulas) com número de matrículas
  app.get('/api/crm/turmas', crmAuth, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('turmas')
        .select(`
          id, name, category, date, time, location, price, enrollment_fee,
          professor_name, professor_email, description, status, student_goal,
          created_at,
          lead_class_enrollments(id, board_status)
        `)
        .order('date', { ascending: false });
      if (error) throw error;
      return res.json({
        data: (data || []).map((t: any) => {
          const enrollments: any[] = t.lead_class_enrollments || [];
          return {
            id: t.id,
            nome: t.name,
            categoria: t.category ?? null,
            data: t.date ?? null,
            hora: t.time ?? null,
            local: t.location ?? null,
            preco: Number(t.price) || 0,
            taxa_matricula: Number(t.enrollment_fee) || 0,
            professor: t.professor_name ?? null,
            professor_email: t.professor_email ?? null,
            descricao: t.description ?? null,
            status: t.status ?? null,
            meta_alunos: t.student_goal ?? null,
            total_matriculas: enrollments.length,
            criado_em: t.created_at,
          };
        }),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/crm/vendedores
  // Lista vendedores/consultores ativos com cargo
  app.get('/api/crm/vendedores', crmAuth, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('perfis')
        .select('id, name, email, phone, department, status, avatar_url, in_round_robin, cargos:role_id(name)')
        .order('name');
      if (error) throw error;
      return res.json({
        data: (data || []).map((p: any) => ({
          id: p.id,
          nome: p.name,
          email: p.email ?? null,
          telefone: p.phone ?? null,
          departamento: p.department ?? null,
          status: p.status ?? null,
          cargo: (p.cargos as any)?.name ?? null,
          avatar: p.avatar_url ?? null,
          no_rodizio: p.in_round_robin ?? true,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/crm/tarefas
  // Lista todas as tarefas com lead e responsável vinculados
  app.get('/api/crm/tarefas', crmAuth, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, title, description, due_date, scheduled_time,
          status, priority, category, lead_id, created_at,
          perfis!tasks_responsavel_usuario_id_fkey(name),
          leads(name)
        `)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return res.json({
        data: (data || []).map((t: any) => ({
          id: t.id,
          titulo: t.title,
          descricao: t.description ?? null,
          lead_id: t.lead_id ?? null,
          lead_nome: (t.leads as any)?.name ?? null,
          responsavel: (t.perfis as any)?.name ?? null,
          prazo: t.due_date ?? null,
          horario: t.scheduled_time ?? null,
          status: t.status,
          prioridade: t.priority,
          categoria: t.category ?? null,
          criado_em: t.created_at,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/crm/metas
  // Lista metas de vendas (empresa e por vendedor)
  app.get('/api/crm/metas', crmAuth, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({
        data: (data || []).map((g: any) => ({
          id: g.id,
          tipo: g.type,
          vendedor_id: g.seller_id ?? null,
          vendedor_nome: g.seller_name ?? null,
          meta_receita: g.revenue_goal ?? null,
          meta_leads: g.leads_goal ?? null,
          meta_chamadas: g.calls_goal ?? null,
          periodo: g.period ?? null,
          criado_em: g.created_at,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/crm/financeiro
  // Lista transações financeiras
  app.get('/api/crm/financeiro', crmAuth, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          id, description, amount, type, status,
          payment_date, due_date, lead_id, created_at
        `)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return res.json({
        data: (data || []).map((t: any) => ({
          id: t.id,
          descricao: t.description ?? null,
          valor: Number(t.amount) || 0,
          tipo: t.type ?? null,
          status: t.status ?? null,
          data_pagamento: t.payment_date ?? null,
          data_vencimento: t.due_date ?? null,
          lead_id: t.lead_id ?? null,
          criado_em: t.created_at,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/crm/chamadas
  // Lista registros de chamadas
  app.get('/api/crm/chamadas', crmAuth, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('call_logs')
        .select('id, user_id, lead_id, type, called_at, perfis!call_logs_user_id_fkey(name), leads(name)')
        .order('called_at', { ascending: false });
      if (error) throw error;
      return res.json({
        data: (data || []).map((c: any) => ({
          id: c.id,
          vendedor_id: c.user_id ?? null,
          vendedor_nome: (c.perfis as any)?.name ?? null,
          lead_id: c.lead_id ?? null,
          lead_nome: (c.leads as any)?.name ?? null,
          tipo: c.type ?? null,
          realizada_em: c.called_at,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/crm/matriculas
  // Lista matrículas de leads em turmas
  app.get('/api/crm/matriculas', crmAuth, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('lead_class_enrollments')
        .select(`
          id, lead_id, class_id, board_status, status,
          valor_recebido, taxa_matricula_recebido,
          pix_completed, contract_signed, seller_origin,
          created_at,
          leads(name, email, phone),
          turmas(name, date, category)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({
        data: (data || []).map((m: any) => ({
          id: m.id,
          lead_id: m.lead_id,
          lead_nome: (m.leads as any)?.name ?? null,
          lead_email: (m.leads as any)?.email ?? null,
          lead_telefone: (m.leads as any)?.phone ?? null,
          turma_id: m.class_id,
          turma_nome: (m.turmas as any)?.name ?? null,
          turma_data: (m.turmas as any)?.date ?? null,
          turma_categoria: (m.turmas as any)?.category ?? null,
          status_quadro: m.board_status ?? null,
          status: m.status ?? null,
          valor_recebido: Number(m.valor_recebido) || 0,
          taxa_matricula_recebido: Number(m.taxa_matricula_recebido) || 0,
          pix_pago: m.pix_completed ?? false,
          contrato_assinado: m.contract_signed ?? false,
          empresa_origem: m.seller_origin ?? null,
          criado_em: m.created_at,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/crm/notas
  // Cria nota em um lead   Body: { leadId, texto }
  app.post('/api/crm/notas', crmAuth, async (req, res) => {
    const { leadId, texto } = req.body ?? {};
    if (!leadId || !texto) {
      return res.status(400).json({ error: 'leadId e texto são obrigatórios.' });
    }
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('notes')
        .insert([{ lead_id: leadId, content: texto, author_name: 'API Externa' }])
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json({
        data: {
          id: data.id,
          lead_id: data.lead_id,
          texto: data.content,
          criado_em: data.created_at,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/crm/tarefas
  // Cria tarefa vinculada a um lead   Body: { leadId, titulo, prazo?, prioridade? }
  app.post('/api/crm/tarefas', crmAuth, async (req, res) => {
    const { leadId, titulo, prazo, prioridade } = req.body ?? {};
    if (!leadId || !titulo) {
      return res.status(400).json({ error: 'leadId e titulo são obrigatórios.' });
    }
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          lead_id: leadId,
          title: titulo,
          due_date: prazo ?? null,
          status: 'pending',
          priority: prioridade ?? 'medium',
        }])
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json({
        data: {
          id: data.id,
          lead_id: data.lead_id,
          titulo: data.title,
          prazo: data.due_date ?? null,
          status: data.status,
          prioridade: data.priority,
          criado_em: data.created_at,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────

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