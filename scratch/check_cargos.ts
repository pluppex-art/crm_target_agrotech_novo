import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  console.log("Checking cargos...");
  const { data: c } = await supabase.from('cargos').select('name');
  console.log("Cargos names:", c?.map(r => r.name));
}

check();
