import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  console.log("Checking profiles...");
  const { data: p1 } = await supabase.from('profiles').select('*').limit(1);
  console.log("profiles sample:", p1?.[0]);

  console.log("Checking perfis...");
  const { data: p2 } = await supabase.from('perfis').select('*').limit(1);
  console.log("perfis sample:", p2?.[0]);
}

check();
