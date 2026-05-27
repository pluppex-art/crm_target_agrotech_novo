import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, key);

const matchesProduct = (productStr: string, allowedStr: string): boolean => {
  const p = productStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const a = allowedStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (p.includes(a) || a.includes(p)) return true;
  if (p.includes("drone") && a.includes("drone")) return true;
  if (
    (p.includes("inseminacao") || p.includes("inseminação") || p.includes("bovino")) &&
    (a.includes("inseminacao") || a.includes("inseminação") || a.includes("bovino"))
  ) return true;
  return false;
};

async function run() {
  console.log("\x1b[32m\x1b[1m==================================================");
  console.log("🔍 DIAGNÓSTICO E SIMULADOR DE RODÍZIO - TARGET CRM");
  console.log("==================================================\x1b[0m");

  // 1. Fetching configurations
  const { data: setting, error: settingErr } = await supabase
    .from('crm_settings')
    .select('value')
    .eq('key', 'round_robin_products')
    .maybeSingle();

  if (settingErr) {
    console.error("❌ Erro ao buscar crm_settings:", settingErr.message);
    return;
  }
  const productRouting = (setting?.value as Record<string, string[]>) || {};

  // 2. Fetching squad details
  const { data: squadMembers, error: squadErr } = await supabase
    .from('squad_members')
    .select('user_id, squad_id, squads(name, company)');

  if (squadErr) {
    console.error("❌ Erro ao buscar squad_members:", squadErr.message);
  }

  const squadMap: Record<string, { squadName: string; company: string }> = {};
  (squadMembers || []).forEach((m: any) => {
    if (m.user_id && m.squads) {
      squadMap[m.user_id] = {
        squadName: m.squads.name || 'Sem Nome',
        company: m.squads.company || 'target'
      };
    }
  });

  // 3. Fetching active profiles
  const { data: profiles, error: profilesErr } = await supabase
    .from('perfis')
    .select('id, name, email, in_round_robin, status, department')
    .eq('status', 'active')
    .ilike('department', 'comercial');

  if (profilesErr) {
    console.error("❌ Erro ao buscar perfis:", profilesErr.message);
    return;
  }

  console.log(`\n\x1b[36m📋 LISTA DE INTEGRANTES DO RODÍZIO ATIVOS NO BANCO:\x1b[0m`);
  console.log("─".repeat(60));

  const activeSellersInRobin: typeof profiles = [];

  profiles.forEach(p => {
    const isRobin = p.in_round_robin !== false;
    if (isRobin) {
      activeSellersInRobin.push(p);
    }
    const squadInfo = squadMap[p.id] || { squadName: 'Sem Squad', company: 'target' };
    const allowed = productRouting[p.id] || [];
    const isAllowedAll = allowed.length === 0;

    console.log(`👤 \x1b[1m${p.name.trim()}\x1b[0m`);
    console.log(`   ✉️  Email: ${p.email}`);
    console.log(`   🏢 Setor: ${p.department || 'N/A'}`);
    console.log(`   👥 Squad: ${squadInfo.squadName} (\x1b[35m${squadInfo.company.toUpperCase()}\x1b[0m)`);
    console.log(`   ⚙️  Rodízio: ${isRobin ? '✅ \x1b[32mATIVO\x1b[0m' : '❌ \x1b[31mBLOQUEADO\x1b[0m'}`);
    console.log(`   🏷️  Produtos: ${isAllowedAll ? '🌟 Recebe Todos' : `🎯 [${allowed.join(', ')}]`}`);
    console.log("─".repeat(60));
  });

  // 4. Round Robin Router simulation
  console.log(`\n\x1b[36m🚀 SIMULADOR DE DISTRIBUIÇÃO DE NOVOS LEADS (Regras Ativas):\x1b[0m`);
  
  const testLeads = [
    { title: "Lead de Drone", interest: "Curso de Piloto de Drone Agrícola" },
    { title: "Lead de Inseminação", interest: "Curso de Inseminação Artificial em Bovinos" }
  ];

  testLeads.forEach(lead => {
    console.log(`\n📥 \x1b[1mRecebendo: "${lead.title}"\x1b[0m`);
    console.log(`   Curso: "${lead.interest}"`);
    
    // Filtering eligible sellers
    const eligible = activeSellersInRobin.filter(s => {
      const allowed = productRouting[s.id];
      if (!allowed || allowed.length === 0) return true;
      if (!lead.interest) return true;
      return allowed.some(p => matchesProduct(lead.interest, p));
    });

    if (eligible.length === 0) {
      console.log(`   \x1b[31m⚠️ Nenhum corretor elegível por produto! Fallback ativado para todos do rodízio.\x1b[0m`);
    } else {
      console.log(`   \x1b[32m✨ Corretores Elegíveis para receber:\x1b[0m`);
      eligible.forEach(s => {
        const squadInfo = squadMap[s.id] || { squadName: 'N/A', company: 'target' };
        console.log(`     👉 ${s.name.trim()} [Origin: ${squadInfo.company.toUpperCase()}]`);
      });
    }
  });

  console.log("\n\x1b[32m\x1b[1m==================================================");
  console.log("✅ FIM DO DIAGNÓSTICO");
  console.log("==================================================\x1b[0m");
}

run();
