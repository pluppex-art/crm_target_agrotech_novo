import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfwclxxcgnmndcnbklkx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmd2NseHhjZ25tbmRjbmJrbGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczNjE3NSwiZXhwIjoyMDkwMzEyMTc1fQ.s2_6MWYcb-nW84UHqZMkcZPj1G2muzt5OJKNrs6bz8g';

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data: attendees } = await supabase.from('turma_attendees').select('*, turmas(status)').neq('status', 'cancelado');
  const activeAttendees = attendees.filter(a => a.turmas && a.turmas.status !== 'cancelada');
  console.log('Total Atendees Ativos em Turmas Ativas:', activeAttendees.length);

  const { data: leads } = await supabase.from('leads').select('*');
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= startOfMonth && new Date(l.created_at) <= endOfMonth);
  
  // Try to find pipelines, if fails, we check by stage_id manually
  const { data: pipelines } = await supabase.from('pipeline_settings').select('*');
  const pipeline = pipelines && pipelines.length > 0 ? pipelines[0] : null;
  const stageMap = new Map(pipeline?.stages?.map(s => [s.id, s.name.toLowerCase()]) || []);

  const closedLeadsThisMonth = leadsThisMonth.filter(l => {
    let stageName = '';
    if (l.stage_id && stageMap.has(l.stage_id)) {
        stageName = stageMap.get(l.stage_id);
    } else {
        stageName = l.status?.toLowerCase() || '';
    }
    return stageName.includes('ganho') || stageName.includes('fechado') || stageName.includes('aprovado') || l.status === 'closed';
  });

  console.log('Ganhos this month:', closedLeadsThisMonth.length);

  const closedLeadsIds = new Set(closedLeadsThisMonth.map(l => l.id));
  
  const attendeesNotInGanhos = activeAttendees.filter(a => !a.lead_id || !closedLeadsIds.has(a.lead_id));
  
  console.log('\n--- Alunos na Turma que NÃO são Ganhos deste mês ---');
  for (const a of attendeesNotInGanhos) {
    if (!a.lead_id) {
      console.log(`- ${a.name} (Adicionado manualmente, sem Lead vinculado)`);
    } else {
      const originalLead = leads.find(l => l.id === a.lead_id);
      if (originalLead) {
        const createdDate = new Date(originalLead.created_at).toLocaleDateString('pt-BR');
        console.log(`- ${a.name} (Lead criado em ${createdDate}, fora do período deste mês)`);
      } else {
        console.log(`- ${a.name} (Lead vinculado não encontrado no banco)`);
      }
    }
  }
}

check();
