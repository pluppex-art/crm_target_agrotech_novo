
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfwclxxcgnmndcnbklkx.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmd2NseHhjZ25tbmRjbmJrbGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczNjE3NSwiZXhwIjoyMDkwMzEyMTc1fQ.s2_6MWYcb-nW84UHqZMkcZPj1G2muzt5OJKNrs6bz8g';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function clearInBatches() {
  console.log('Limpando notificações em lotes...');
  let deletedCount = 0;
  
  while (true) {
    // Fetch some IDs first
    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .limit(100);
      
    if (fetchError) {
      console.error('Erro ao buscar IDs:', fetchError);
      break;
    }
    
    if (!data || data.length === 0) {
      console.log('Nenhuma notificação restando.');
      break;
    }
    
    const ids = data.map(n => n.id);
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .in('id', ids);
      
    if (deleteError) {
      console.error('Erro ao deletar lote:', deleteError);
      break;
    }
    
    deletedCount += ids.length;
    console.log(`Deletados: ${deletedCount}`);
  }
  
  console.log('Processo finalizado.');
}

clearInBatches();
