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
  // 1. Busca IDs dos cargos de Vendedor/Consultor
  const { data: vendedorCargos } = await supabase
    .from('cargos')
    .select('id')
    .or('name.ilike.%vendedor%,name.ilike.%consultor%');

  const vendedorCargoIds = (vendedorCargos || []).map((c: any) => c.id);

  // 2. Busca vendedores ativos do departamento Comercial com esses cargos
  const { data: sellers } = await supabase
    .from('perfis')
    .select('name, phone')
    .eq('department', 'Comercial')
    .or('status.eq.active,status.is.null')
    .in('role_id', vendedorCargoIds.length > 0 ? vendedorCargoIds : [''])
    .order('name', { ascending: true });

  const validSellers = sellers || [];

  let assignedResponsible = null;
  let assignedPhone = null;

  if (validSellers.length > 0) {
    // 2. Find the last assigned lead's responsible *from our valid list*
    const { data: lastLead } = await supabase
      .from('leads')
      .select('responsible')
      .in('responsible', validSellers.map(s => s.name))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastLead && lastLead.responsible) {
      // Trim comparison to handle trailing spaces in DB
      const lastResp = lastLead.responsible.trim();
      const lastIndex = validSellers.findIndex(s => s.name.trim() === lastResp);
      const nextIndex = (lastIndex + 1) % validSellers.length;
      assignedResponsible = validSellers[nextIndex].name;
      assignedPhone = validSellers[nextIndex].phone;
    } else {
      assignedResponsible = validSellers[0].name;
      assignedPhone = validSellers[0].phone;
    }
  }

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
      status: 'Novos Leads',
      responsible: assignedResponsible,
      stars: 1,
      value: Number(value) || 0,
      substatus: 'qualified',
      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=059669&color=fff&size=128`,
    }])
    .select()
    .single();

  if (leadError) {
    console.error('Error creating lead:', leadError);
    return res.status(500).json({ error: leadError.message });
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
