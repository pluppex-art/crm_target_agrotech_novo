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

  const { name, email, phone, city, product, value } = req.body ?? {};

  if (!name || !email || !phone || !product) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, email, phone, product.' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Configuração do servidor ausente.' });
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from('leads')
    .insert([{
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      city: city?.trim() ?? null,
      product: product.trim(),
      pipeline_id: PIPELINE_ID,
      stage_id: STAGE_ID,
      status: 'Novos Leads',
      stars: 1,
      value: Number(value) || 0,
      substatus: null,
      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=059669&color=fff&size=128`,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating lead:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, id: data.id });
}
