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
  // 1. Fetch active sellers (Comercial + Cargo Vendedor) sorted by name
  // Join with 'cargos' table to check the role name
  const { data: sellers } = await supabase
    .from('profiles')
    .select(`
      name,
      department,
      status,
      phone,
      cargos!role_id ( name )
    `)
    .eq('department', 'Comercial')
    .or('status.eq.active,status.is.null')
    .order('name', { ascending: true });

  // Filter in JS to handle role name check (Supabase join filtering can be tricky)
  const validSellers = (sellers || []).filter(s => {
    const cargoName = (s.cargos as any)?.name?.toLowerCase() || '';
    return cargoName.includes('vendedor') || cargoName.includes('consultor');
  });

  let assignedResponsible = null;
  let assignedPhone = null;

  if (validSellers.length > 0) {
    // 2. Find the last assigned lead's responsible
    const { data: lastLead } = await supabase
      .from('leads')
      .select('responsible')
      .not('responsible', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastLead && lastLead.responsible) {
      const lastIndex = validSellers.findIndex(s => s.name === lastLead.responsible);
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

  const { data, error } = await supabase
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
      notes: notes,
      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=059669&color=fff&size=128`,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating lead:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ 
    success: true, 
    id: data.id, 
    responsibleName: assignedResponsible, 
    responsiblePhone: assignedPhone 
  });
}
