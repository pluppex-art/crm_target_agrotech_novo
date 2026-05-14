
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in leads table:', Object.keys(data[0]));
  } else {
    console.log('No data in leads table to check columns.');
    // Try to get one from another table or just list them via RPC if available
  }
}

checkColumns();
