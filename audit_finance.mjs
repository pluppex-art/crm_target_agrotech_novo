import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfwclxxcgnmndcnbklkx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmd2NseHhjZ25tbmRjbmJrbGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczNjE3NSwiZXhwIjoyMDkwMzEyMTc1fQ.s2_6MWYcb-nW84UHqZMkcZPj1G2muzt5OJKNrs6bz8g';

const supabase = createClient(supabaseUrl, serviceKey);

async function runAudit() {
  console.log("=== INICIANDO AUDITORIA TÉCNICA (MÓDULO FINANCEIRO) ===\n");

  const tables = [
    'financial_categories',
    'financial_transactions',
    'squads',
    'squad_members',
    'commission_rules',
    'commission_results'
  ];

  console.log("1. Verificando existência de tabelas:");
  let tablesOk = true;
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === '42P01') {
      console.log(`[ERRO] Tabela ${table} NÃO encontrada.`);
      tablesOk = false;
    } else if (error) {
       console.log(`[AVISO] Tabela ${table}: ${error.message}`);
    } else {
      console.log(`[OK] Tabela ${table} encontrada.`);
    }
  }

  if (!tablesOk) {
    console.log("Abortando testes de trigger pois tabelas faltam.");
    return;
  }

  console.log("\n2. Executando simulação de E2E (Triggers e Idempotência)...");
  
  // 1. Criar lead de teste
  const leadName = 'Lead Teste Auditoria ' + Date.now();
  const { data: lead, error: errLead } = await supabase.from('leads').insert([{
    name: leadName,
    phone: '11999999999',
    status: 'new',
    value: '1500.00'
  }]).select().single();

  if (errLead) {
    console.log("[ERRO] Falha ao criar lead de teste:", errLead);
    return;
  }
  console.log(`[OK] Lead de teste criado. ID: ${lead.id}`);

  // 2. Mover para Ganho
  const { error: errUpdate1 } = await supabase.from('leads').update({ status: 'closed' }).eq('id', lead.id);
  if (errUpdate1) console.log("[ERRO] Erro ao atualizar lead para ganho:", errUpdate1);
  else console.log(`[OK] Lead atualizado para 'closed' (Ganho).`);

  // 3. Confirmar criação da receita
  const { data: tx1 } = await supabase.from('financial_transactions').select('*').eq('lead_id', lead.id);
  if (tx1 && tx1.length === 1) {
    console.log(`[OK] Receita automática criada com sucesso. Amount: ${tx1[0].amount}, Status: ${tx1[0].status}`);
  } else {
    console.log(`[ERRO] Receita não criada ou duplicada. Count: ${tx1 ? tx1.length : 0}`);
  }

  // 4. Repetir evento de Ganho para testar Idempotência (Trigger de Pipeline)
  const { error: errUpdate2 } = await supabase.from('leads').update({ value: '1600.00', status: 'closed' }).eq('id', lead.id);
  const { data: tx2 } = await supabase.from('financial_transactions').select('*').eq('lead_id', lead.id);
  if (tx2 && tx2.length === 1) {
    console.log(`[OK] Idempotência do Pipeline: Receita não duplicada! Amount atualizado para: ${tx2[0].amount}`);
  } else {
    console.log(`[ERRO] Idempotência falhou. Count: ${tx2 ? tx2.length : 0}`);
  }

  // 5. Mudar Receita para PAID (para gerar despesa de comissão provisória)
  if (tx2 && tx2.length > 0) {
    const revId = tx2[0].id;
    const { error: errPay } = await supabase.from('financial_transactions').update({ status: 'PAID' }).eq('id', revId);
    if (errPay) console.log("[ERRO] Falha ao pagar receita:", errPay);

    // 6. Checar se a comissão provisória foi gerada atrelada ao source_transaction_id
    const { data: comm1 } = await supabase.from('financial_transactions').select('*').eq('source_transaction_id', revId);
    if (comm1 && comm1.length === 1) {
      console.log(`[OK] Comissão de despesa criada! Origin: ${comm1[0].origin_type}, Status: ${comm1[0].status}`);
    } else {
      console.log(`[ERRO] Comissão não gerada ou duplicada. Count: ${comm1 ? comm1.length : 0}`);
    }

    // 7. Repetir PAID (Testar Idempotência de Comissão)
    // Para repetir PAID, temos que voltar para PENDING e ir para PAID de novo, ou dar um dummy update.
    await supabase.from('financial_transactions').update({ description: 'Update teste' }).eq('id', revId);
    const { data: comm2 } = await supabase.from('financial_transactions').select('*').eq('source_transaction_id', revId);
    if (comm2 && comm2.length === 1) {
      console.log(`[OK] Idempotência de Comissão: Despesa não duplicada após novo update na receita!`);
    } else {
      console.log(`[ERRO] Idempotência de Comissão falhou. Count: ${comm2 ? comm2.length : 0}`);
    }

    // Limpar o teste (Cascades devem apagar a comissão também, mas excluiremos a receita e o lead manualmente)
    await supabase.from('financial_transactions').delete().eq('id', revId);
  }

  await supabase.from('leads').delete().eq('id', lead.id);
  console.log("\n=== FIM DA AUDITORIA (Ambiente limpo) ===");
}

runAudit();
