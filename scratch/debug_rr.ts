import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function debugRoundRobin() {
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  console.log("--- Fetching Perfis ---");
  const { data: sellers, error } = await supabase
    .from('perfis')
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

  if (error) {
    console.error("Query Error:", error);
    return;
  }

  console.log("Total Comercial active found:", sellers?.length);
  sellers?.forEach(s => {
    console.log(`- Name: ${s.name}, Phone: ${s.phone}, Cargo: ${(s.cargos as any)?.name}`);
  });

  const validSellers = (sellers || []).filter(s => {
    const cargoName = (s.cargos as any)?.name?.toLowerCase() || '';
    return cargoName.includes('vendedor') || cargoName.includes('consultor');
  });

  console.log("--- Valid Sellers for Round Robin ---");
  console.log("Total valid found:", validSellers.length);
  validSellers.forEach(s => {
    console.log(`- ${s.name} (${s.phone})`);
  });

  console.log("--- Last Assigned Lead ---");
  const { data: lastLead } = await supabase
    .from('leads')
    .select('responsible')
    .not('responsible', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  console.log("Last responsible:", lastLead?.responsible);
}

debugRoundRobin();
