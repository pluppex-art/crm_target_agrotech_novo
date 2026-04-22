import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log(JSON.stringify(data?.[0], null, 2));
}

check();
