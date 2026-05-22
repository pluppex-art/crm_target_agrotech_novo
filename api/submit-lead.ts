import { createClient } from '@supabase/supabase-js';

// Pipeline Principal / Novos Leads
const PIPELINE_ID = '31f2fdbb-7b19-4973-8f70-7bb629697f11';
const STAGE_ID = '36f5f922-ac1d-4742-a2b5-43a9af25b37d';

export default async function handler(req: any, res: any) {
  // Allow CORS for the public form
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Extraction & Validation ─────────────────────────────────────────────
  const { name, email, phone, city, product, value, interest, notes: extraNotes } = req.body ?? {};

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Campos obrigatórios: Nome, E-mail e Telefone.' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Configuração do servidor ausente.' });
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Round Robin (Rodízio) Logic ──────────────────────────────────────────
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

  const { data: sellers } = await sellersQuery;

  // Ordena alfabeticamente em pt-BR (ignora maiúsculas/minúsculas e acentos)
  const validSellers = (sellers || []).sort((a, b) =>
    a.name.trim().localeCompare(b.name.trim(), 'pt-BR', { sensitivity: 'base' })
  );

  let assignedResponsible = null;
  let assignedUserId = null;
  let assignedPhone = null;

  if (validSellers.length > 0) {

    // Fallback: se o estado dedicado estiver vazio, busca o último lead da tabela
    if (!lastSellerId) {
      const { data: lastLead } = await supabase
        .from('leads')
        .select('responsavel_usuario_id')
        .in('responsavel_usuario_id', validSellers.map(s => s.id))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      lastSellerId = lastLead?.responsavel_usuario_id ?? null;
    }

    const lastIndex = lastSellerId
      ? validSellers.findIndex(s => s.id === lastSellerId)
      : -1;
    const nextIndex = (lastIndex + 1) % validSellers.length;
    assignedResponsible = validSellers[nextIndex].name;
    assignedUserId = validSellers[nextIndex].id;
    assignedPhone = validSellers[nextIndex].phone;
  }

  // Buscar centro de custo 'cursos' para obter o ID estrutural
  const { data: ccCursos } = await supabase
    .from('centro_custos')
    .select('id')
    .ilike('nome', 'cursos')
    .maybeSingle();
  const centroCustoId = ccCursos?.id || null;

  // ── Insert Lead ─────────────────────────────────────────────────────────
  // Combine interest and other notes
  const notes = [
    interest ? `Área de Interesse: ${interest}` : null,
    extraNotes ? `Notas: ${extraNotes}` : null
  ].filter(Boolean).join('\n');

  const { data: leadData, error: leadError } = await supabase
    .from('leads')
    .insert([{
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
    }])
    .select()
    .single();

  if (leadError) {
    console.error('Error creating lead:', leadError);
    return res.status(500).json({ error: leadError.message });
  }

  // ── Atualiza estado do rodízio ───────────────────────────────────────────
  if (assignedUserId) {
    await supabase
      .from('round_robin_state')
      .upsert({ 
        id: 'form_leads', 
        last_seller_id: assignedUserId, 
        last_seller_name: assignedResponsible, 
        updated_at: new Date().toISOString() 
      });
  }

  // ── Notifica vendedor responsável por e-mail ─────────────────────────────
  if (assignedUserId) {
    const { data: sellerProfile } = await supabase
      .from('perfis')
      .select('email, name')
      .eq('id', assignedUserId)
      .single();

    const resendKey = process.env.RESEND_API_KEY;
    if (sellerProfile?.email && resendKey) {
      const prodName = product?.trim() || 'N/A';
      const html = `
        <div style="font-family:'Segoe UI',sans-serif;background-color:#f8fafc;padding:40px 20px;color:#1e293b;line-height:1.6;">
          <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:24px;overflow:hidden;">
            <div style="background-color:#059669;padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">TARGET AGROTECH</h1>
            </div>
            <div style="padding:40px 32px;">
              <div style="background-color:#ecfdf5;color:#059669;padding:12px 20px;border-radius:12px;font-size:12px;font-weight:800;text-transform:uppercase;display:inline-block;margin-bottom:16px;">🔔 NOVO LEAD CHEGOU!</div>
              <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 16px 0;">Olá, ${sellerProfile.name || assignedResponsible}!</h2>
              <p style="font-size:16px;color:#475569;margin-bottom:24px;">Um novo potencial cliente acaba de entrar no seu funil via formulário. Confira os detalhes abaixo:</p>
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding-bottom:12px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Nome do Lead</td><td style="padding-bottom:12px;color:#1e293b;font-size:14px;font-weight:700;text-align:right;">${name.trim()}</td></tr>
                  <tr><td style="padding-bottom:12px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Telefone</td><td style="padding-bottom:12px;color:#1e293b;font-size:14px;font-weight:700;text-align:right;">${phone.trim()}</td></tr>
                  <tr><td style="padding-bottom:12px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">E-mail</td><td style="padding-bottom:12px;color:#1e293b;font-size:14px;font-weight:700;text-align:right;">${email.trim().toLowerCase()}</td></tr>
                  <tr><td style="padding-bottom:12px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Interesse</td><td style="padding-bottom:12px;color:#1e293b;font-size:14px;font-weight:700;text-align:right;">${prodName}</td></tr>
                  <tr><td style="padding-bottom:0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Origem</td><td style="padding-bottom:0;color:#1e293b;font-size:14px;font-weight:700;text-align:right;">Formulário Público</td></tr>
                </table>
              </div>
              <div style="margin-top:32px;text-align:center;">
                <a href="https://crm.targetagrotech.com.br/pipeline" style="display:inline-block;background-color:#059669;color:#ffffff;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;">Acessar Funil e Atender</a>
              </div>
            </div>
            <div style="background-color:#f1f5f9;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">© 2026 Target Agrotech • Tecnologia e Performance</p>
            </div>
          </div>
        </div>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Target Agrotech <crm@notificacoes.targetagrotech.com.br>',
          to: [sellerProfile.email],
          subject: `🔔 Novo Lead: ${name.trim()}`,
          html,
        }),
      }).catch(err => console.error('Erro ao notificar vendedor via Resend:', err));
    }
  }

  // ── Create Note (Interesse) ──────────────────────────────────────────────
  if (notes) {
    const { error: noteError } = await supabase
      .from('notes')
      .insert([{
        content: notes,
        lead_id: leadData.id,
        author_name: 'Sistema',
      }]);
    
    if (noteError) {
      console.error('Error creating note:', noteError);
      // Not a fatal error, we already created the lead
    }
  }

  return res.status(200).json({ 
    success: true, 
    id: leadData.id, 
    responsibleName: assignedResponsible, 
    responsiblePhone: assignedPhone 
  });
}
