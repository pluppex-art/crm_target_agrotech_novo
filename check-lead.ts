import { getSupabaseAdmin } from './src/lib/supabase'; // Wait, server.ts has getSupabaseAdmin
import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdminClient = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  const { data, error } = await supabaseAdminClient.from('leads').select('id, name, email, phone').ilike('name', '%test%');
  console.log("Leads com 'test':", data);
  
  const { data: byId } = await supabaseAdminClient.from('leads').select('id, name').eq('id', '51331504-0e67-475a-9e6c-2df30daccb69');
  console.log("Lead antigo por ID:", byId);
}

run().catch(console.error);
