
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfwclxxcgnmndcnbklkx.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmd2NseHhjZ25tbmRjbmJrbGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczNjE3NSwiZXhwIjoyMDkwMzEyMTc1fQ.s2_6MWYcb-nW84UHqZMkcZPj1G2muzt5OJKNrs6bz8g';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testDelete() {
  const { data, error } = await supabase.from('notifications').select('id').limit(1);
  if (error) {
    console.error('Fetch error:', error);
    return;
  }
  console.log('Fetch success, IDs found:', data.length);
  if (data.length > 0) {
    const { error: delError } = await supabase.from('notifications').delete().eq('id', data[0].id);
    if (delError) console.error('Delete error:', delError);
    else console.log('Delete success');
  }
}

testDelete();
