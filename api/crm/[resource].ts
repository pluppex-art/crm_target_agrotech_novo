import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase config missing');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
function setCors(res: any, methods = 'GET, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
function checkAuth(req: any, res: any): boolean {
  const expected = process.env.TARGET_API_KEY;
  if (!expected) { res.status(500).json({ error: 'TARGET_API_KEY não configurada.' }); return false; }
  const auth = req.headers['authorization'] as string | undefined;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Authorization: Bearer {token} obrigatório.' }); return false; }
  if (auth.slice(7).trim() !== expected) { res.status(403).json({ error: 'Token inválido.' }); return false; }
  return true;
}

const GET_RESOURCES = new Set(['leads','turmas','vendedores','tarefas','metas','financeiro','chamadas','matriculas']);
const POST_RESOURCES = new Set(['tarefas','notas']);

export default async function handler(req: any, res: any) {
  const { resource } = req.query as { resource: string };
  const allowsGet = GET_RESOURCES.has(resource);
  const allowsPost = POST_RESOURCES.has(resource);
  if (!allowsGet && !allowsPost) return res.status(404).json({ error: 'Recurso não encontrado.' });

  const methods = [allowsGet && 'GET', allowsPost && 'POST', 'OPTIONS'].filter(Boolean).join(', ');
  setCors(res, methods);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  if (req.method === 'GET' && allowsGet) return handleGet(resource, res);
  if (req.method === 'POST' && allowsPost) return handlePost(resource, req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(resource: string, res: any) {
  const supabase = getSupabase() as any;
  try {
    switch (resource) {
      case 'leads': {
        const { data: leads, error } = await supabase
          .from('leads')
          .select('id, name, email, phone, city, product, value, status, substatus, responsible, responsavel_usuario_id, stage_id, stars, lead_source, seller_origin, cost_center, pix_completed, contract_signed, motivo_perda, created_at, updated_at, last_contact_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const rows = leads || [];
        const stageIds = [...new Set(rows.map((l: any) => l.stage_id).filter(Boolean))];
        const { data: stagesData } = stageIds.length
          ? await supabase.from('pipeline_stages').select('id, name').in('id', stageIds)
          : { data: [] };
        const stagesMap = new Map<string, any>((stagesData || []).map((s: any) => [s.id, s]));
        return res.json({
          data: rows.map((l: any) => ({
            id: l.id, nome: l.name, email: l.email ?? null, telefone: l.phone ?? null,
            cidade: l.city ?? null, produto: l.product ?? null, valor: Number(l.value) || 0,
            status: l.status ?? null, substatus: l.substatus ?? null,
            estagio: stagesMap.get(l.stage_id)?.name ?? null,
            responsavel: l.responsible ?? null, responsavel_id: l.responsavel_usuario_id ?? null,
            estrelas: l.stars ?? null, origem: l.lead_source ?? null,
            empresa_origem: l.seller_origin ?? null, centro_custo: l.cost_center ?? null,
            pix_pago: l.pix_completed ?? false, contrato_assinado: l.contract_signed ?? false,
            motivo_perda: l.motivo_perda ?? null, criado_em: l.created_at,
            atualizado_em: l.updated_at ?? null, ultimo_contato: l.last_contact_at ?? null,
          })),
        });
      }
      case 'turmas': {
        const { data: turmas, error } = await supabase
          .from('turmas')
          .select('id, name, category, date, time, location, price, enrollment_fee, professor_name, professor_email, description, status, student_goal, created_at')
          .order('date', { ascending: false });
        if (error) throw error;
        const rows = turmas || [];
        const turmaIds = rows.map((t: any) => t.id);
        const { data: enrollmentsData } = turmaIds.length
          ? await supabase.from('lead_class_enrollments').select('class_id').in('class_id', turmaIds)
          : { data: [] };
        const enrollmentCount = new Map<string, number>();
        for (const e of (enrollmentsData || [])) {
          enrollmentCount.set(e.class_id, (enrollmentCount.get(e.class_id) ?? 0) + 1);
        }
        return res.json({
          data: rows.map((t: any) => ({
            id: t.id, nome: t.name, categoria: t.category ?? null, data: t.date ?? null,
            hora: t.time ?? null, local: t.location ?? null, preco: Number(t.price) || 0,
            taxa_matricula: Number(t.enrollment_fee) || 0, professor: t.professor_name ?? null,
            professor_email: t.professor_email ?? null, descricao: t.description ?? null,
            status: t.status ?? null, meta_alunos: t.student_goal ?? null,
            total_matriculas: enrollmentCount.get(t.id) ?? 0, criado_em: t.created_at,
          })),
        });
      }
      case 'vendedores': {
        const { data: perfis, error } = await supabase
          .from('perfis')
          .select('id, name, email, phone, department, status, avatar_url, in_round_robin, role_id')
          .order('name');
        if (error) throw error;
        const rows = perfis || [];
        const roleIds = [...new Set(rows.map((p: any) => p.role_id).filter(Boolean))];
        const { data: cargosData } = roleIds.length
          ? await supabase.from('cargos').select('id, name').in('id', roleIds)
          : { data: [] };
        const cargosMap = new Map<string, any>((cargosData || []).map((c: any) => [c.id, c]));
        return res.json({
          data: rows.map((p: any) => ({
            id: p.id, nome: p.name, email: p.email ?? null, telefone: p.phone ?? null,
            departamento: p.department ?? null, status: p.status ?? null,
            cargo: cargosMap.get(p.role_id)?.name ?? null, avatar: p.avatar_url ?? null,
            no_rodizio: p.in_round_robin ?? true,
          })),
        });
      }
      case 'tarefas': {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('id, title, description, due_date, scheduled_time, status, priority, category, lead_id, responsavel_usuario_id, created_at')
          .order('due_date', { ascending: true });
        if (error) throw error;
        const rows = tasks || [];
        const userIds = [...new Set(rows.map((t: any) => t.responsavel_usuario_id).filter(Boolean))];
        const leadIds = [...new Set(rows.map((t: any) => t.lead_id).filter(Boolean))];
        const [{ data: perfisData }, { data: leadsData }] = await Promise.all([
          userIds.length ? supabase.from('perfis').select('id, name').in('id', userIds) : Promise.resolve({ data: [] }),
          leadIds.length ? supabase.from('leads').select('id, name').in('id', leadIds) : Promise.resolve({ data: [] }),
        ]);
        const perfisMap = new Map<string, any>((perfisData || []).map((p: any) => [p.id, p]));
        const leadsMap = new Map<string, any>((leadsData || []).map((l: any) => [l.id, l]));
        return res.json({
          data: rows.map((t: any) => ({
            id: t.id, titulo: t.title, descricao: t.description ?? null,
            lead_id: t.lead_id ?? null, lead_nome: leadsMap.get(t.lead_id)?.name ?? null,
            responsavel: perfisMap.get(t.responsavel_usuario_id)?.name ?? null,
            prazo: t.due_date ?? null, horario: t.scheduled_time ?? null,
            status: t.status, prioridade: t.priority, categoria: t.category ?? null,
            criado_em: t.created_at,
          })),
        });
      }
      case 'metas': {
        const { data, error } = await supabase
          .from('goals').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.json({
          data: (data || []).map((g: any) => ({
            id: g.id, tipo: g.type, vendedor_id: g.seller_id ?? null,
            vendedor_nome: g.seller_name ?? null, meta_receita: g.revenue_goal ?? null,
            meta_leads: g.leads_goal ?? null, meta_chamadas: g.calls_goal ?? null,
            periodo: g.period ?? null, criado_em: g.created_at,
          })),
        });
      }
      case 'financeiro': {
        const { data, error } = await supabase
          .from('financial_transactions')
          .select('id, description, amount, type, status, payment_date, due_date, lead_id, created_at')
          .order('payment_date', { ascending: false });
        if (error) throw error;
        return res.json({
          data: (data || []).map((t: any) => ({
            id: t.id, descricao: t.description ?? null, valor: Number(t.amount) || 0,
            tipo: t.type ?? null, status: t.status ?? null,
            data_pagamento: t.payment_date ?? null, data_vencimento: t.due_date ?? null,
            lead_id: t.lead_id ?? null, criado_em: t.created_at,
          })),
        });
      }
      case 'chamadas': {
        const { data: logs, error } = await supabase
          .from('call_logs')
          .select('id, user_id, lead_id, type, called_at')
          .order('called_at', { ascending: false });
        if (error) throw error;
        const calls = logs || [];
        const userIds = [...new Set(calls.map((c: any) => c.user_id).filter(Boolean))];
        const leadIds = [...new Set(calls.map((c: any) => c.lead_id).filter(Boolean))];
        const [{ data: perfisData }, { data: leadsData }] = await Promise.all([
          userIds.length ? supabase.from('perfis').select('id, name').in('id', userIds) : Promise.resolve({ data: [] }),
          leadIds.length ? supabase.from('leads').select('id, name').in('id', leadIds) : Promise.resolve({ data: [] }),
        ]);
        const perfisMap = new Map<string, any>((perfisData || []).map((p: any) => [p.id, p]));
        const leadsMap = new Map<string, any>((leadsData || []).map((l: any) => [l.id, l]));
        return res.json({
          data: calls.map((c: any) => ({
            id: c.id, vendedor_id: c.user_id ?? null,
            vendedor_nome: perfisMap.get(c.user_id)?.name ?? null,
            lead_id: c.lead_id ?? null, lead_nome: leadsMap.get(c.lead_id)?.name ?? null,
            tipo: c.type ?? null, realizada_em: c.called_at,
          })),
        });
      }
      case 'matriculas': {
        const { data: enrollments, error } = await supabase
          .from('lead_class_enrollments')
          .select('id, lead_id, class_id, board_status, status, valor_recebido, taxa_matricula_recebido, pix_completed, contract_signed, seller_origin, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const rows = enrollments || [];
        const leadIds = [...new Set(rows.map((r: any) => r.lead_id).filter(Boolean))];
        const classIds = [...new Set(rows.map((r: any) => r.class_id).filter(Boolean))];
        const [{ data: leadsData }, { data: turmasData }] = await Promise.all([
          leadIds.length ? supabase.from('leads').select('id, name, email, phone').in('id', leadIds) : Promise.resolve({ data: [] }),
          classIds.length ? supabase.from('turmas').select('id, name, date, category').in('id', classIds) : Promise.resolve({ data: [] }),
        ]);
        const leadsMap = new Map<string, any>((leadsData || []).map((l: any) => [l.id, l]));
        const turmasMap = new Map<string, any>((turmasData || []).map((t: any) => [t.id, t]));
        return res.json({
          data: rows.map((m: any) => {
            const lead = leadsMap.get(m.lead_id);
            const turma = turmasMap.get(m.class_id);
            return {
              id: m.id, lead_id: m.lead_id, lead_nome: lead?.name ?? null,
              lead_email: lead?.email ?? null, lead_telefone: lead?.phone ?? null,
              turma_id: m.class_id, turma_nome: turma?.name ?? null,
              turma_data: turma?.date ?? null, turma_categoria: turma?.category ?? null,
              status_quadro: m.board_status ?? null, status: m.status ?? null,
              valor_recebido: Number(m.valor_recebido) || 0,
              taxa_matricula_recebido: Number(m.taxa_matricula_recebido) || 0,
              pix_pago: m.pix_completed ?? false, contrato_assinado: m.contract_signed ?? false,
              empresa_origem: m.seller_origin ?? null, criado_em: m.created_at,
            };
          }),
        });
      }
      default:
        return res.status(404).json({ error: 'Recurso não encontrado.' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

async function handlePost(resource: string, req: any, res: any) {
  const supabase = getSupabase() as any;
  try {
    switch (resource) {
      case 'tarefas': {
        const { leadId, titulo, prazo, prioridade } = req.body ?? {};
        if (!leadId || !titulo) return res.status(400).json({ error: 'leadId e titulo são obrigatórios.' });
        const { data, error } = await supabase
          .from('tasks')
          .insert([{ lead_id: leadId, title: titulo, due_date: prazo ?? null, status: 'pending', priority: prioridade ?? 'medium' }])
          .select().single();
        if (error) throw error;
        return res.status(201).json({
          data: { id: data.id, lead_id: data.lead_id, titulo: data.title, prazo: data.due_date ?? null, status: data.status, prioridade: data.priority, criado_em: data.created_at },
        });
      }
      case 'notas': {
        const { leadId, texto } = req.body ?? {};
        if (!leadId || !texto) return res.status(400).json({ error: 'leadId e texto são obrigatórios.' });
        const { data, error } = await supabase
          .from('notes')
          .insert([{ lead_id: leadId, content: texto, author_name: 'API Externa' }])
          .select().single();
        if (error) throw error;
        return res.status(201).json({ data: { id: data.id, lead_id: data.lead_id, texto: data.content, criado_em: data.created_at } });
      }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
