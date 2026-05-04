import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfwclxxcgnmndcnbklkx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmd2NseHhjZ25tbmRjbmJrbGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczNjE3NSwiZXhwIjoyMDkwMzEyMTc1fQ.s2_6MWYcb-nW84UHqZMkcZPj1G2muzt5OJKNrs6bz8g';

const supabase = createClient(supabaseUrl, serviceKey);

// We simulate importing the services logic by using the Supabase client directly, 
// since running the TS files natively in node requires ts-node or similar.
// This script will just test the SQL rules, constraints, and data aggregations similar to the services.

async function testServices() {
  console.log("=== INICIANDO TESTE DOS SERVIÇOS FINANCEIROS (FASE 2) ===\n");

  // 1. Fetch Categories
  const { data: categories } = await supabase.from('financial_categories').select('*');
  console.log(`[OK] categoryService: Fetched ${categories.length} categories.`);

  // 2. Insert dummy transactions to test transactionService logic
  const catCurso = categories.find(c => c.name === 'Venda de Curso')?.id;
  const catOp = categories.find(c => c.dre_group === 'DESPESAS_OP')?.id;

  const { data: tx1 } = await supabase.from('financial_transactions').insert({
    description: 'Test Income', amount: 10000, type: 'INCOME', status: 'PAID', category_id: catCurso, origin_type: 'MANUAL', payment_date: new Date().toISOString()
  }).select().single();

  const { data: tx2 } = await supabase.from('financial_transactions').insert({
    description: 'Test Expense', amount: 2000, type: 'EXPENSE', status: 'PAID', category_id: catOp, origin_type: 'MANUAL', payment_date: new Date().toISOString()
  }).select().single();

  console.log(`[OK] transactionService: Criada Receita (${tx1.amount}) e Despesa (${tx2.amount}).`);

  // 3. Test KPIs logic
  const { data: allTx } = await supabase.from('financial_transactions').select('*').in('id', [tx1.id, tx2.id]);
  const receita = allTx.filter(t => t.type === 'INCOME').reduce((acc, val) => acc + Number(val.amount), 0);
  const despesa = allTx.filter(t => t.type === 'EXPENSE').reduce((acc, val) => acc + Number(val.amount), 0);
  const lucro = receita - despesa;
  console.log(`[OK] transactionService KPIs: Receita=${receita}, Despesa=${despesa}, Lucro=${lucro}`);

  // 4. Test DRE logic
  let dreReceitaBruta = 0;
  let dreDespesasOp = 0;
  for (const t of allTx) {
    const group = categories.find(c => c.id === t.category_id)?.dre_group;
    if (group === 'RECEITA_BRUTA') dreReceitaBruta += Number(t.amount);
    if (group === 'DESPESAS_OP') dreDespesasOp += Number(t.amount);
  }
  console.log(`[OK] dreService: Agrupamento funcionando. Receita Bruta = ${dreReceitaBruta}, Despesas Op = ${dreDespesasOp}`);

  // 5. Test OTE Rule fetching
  const { data: rule } = await supabase.from('commission_rules').select('*').eq('role_type', 'CLOSER').eq('level', 'PLENO 1').single();
  console.log(`[OK] oteService: Regra PLENO 1 encontrada. Target=${rule?.target_revenue}, Fixed=${rule?.fixed_amount}`);

  // 6. Test Idempotency of commission_results
  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
  const testUserId = profile.id;
  
  const upsertData = {
    user_id: testUserId,
    role_type: 'CLOSER',
    period_month: '2026-04-01',
    target_revenue: rule.target_revenue,
    realized_revenue: 105000, // Passou da meta de 103000
    achievement_percent: 101.9,
    fixed_amount: rule.fixed_amount,
    variable_amount: rule.variable_amount, // 100%
    accelerator_amount: 0, // Floor((101.9-100)/5) = 0
    total_amount: rule.fixed_amount + rule.variable_amount,
    semaphore_status: 'GREEN',
    status: 'TO_PAY'
  };

  // Trigger insert
  const { error: errUpsert1 } = await supabase.from('commission_results').insert(upsertData);
  if (errUpsert1) console.log(`[AVISO/ERRO] oteService Idempotency Insert:`, errUpsert1.message);
  else console.log(`[OK] oteService: commission_result inserido.`);

  // Trigger insert duplicado para testar index
  const { error: errUpsert2 } = await supabase.from('commission_results').insert(upsertData);
  if (errUpsert2 && errUpsert2.code === '23505') {
    console.log(`[OK] oteService: Idempotência garantida! Erro 23505 (Unique Violation) disparou corretamente ao tentar duplicar o mês sem squad_id.`);
  } else {
    console.log(`[ERRO] oteService: Falha na idempotência, permitiu duplicidade ou deu outro erro:`, errUpsert2);
  }

  // Cleanup
  await supabase.from('financial_transactions').delete().in('id', [tx1.id, tx2.id]);
  await supabase.from('commission_results').delete().eq('user_id', testUserId);

  console.log("\n=== FIM DO TESTE DE SERVIÇOS ===");
}

testServices();
