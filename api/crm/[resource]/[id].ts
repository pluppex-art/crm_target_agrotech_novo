import { getSupabase, setCors, checkAuth } from '../../_lib/crm';

const RESOURCE_CONFIG: Record<string, { table: string; allowed: Record<string, string>; returnFields: string; addUpdatedAt?: boolean }> = {
  leads: {
    table: 'leads',
    allowed: {
      nome: 'name', email: 'email', telefone: 'phone', cidade: 'city',
      produto: 'product', valor: 'value', status: 'status', substatus: 'substatus',
      responsavel_id: 'responsavel_usuario_id', estagio_id: 'stage_id',
      motivo_perda: 'motivo_perda', pix_pago: 'pix_completed', contrato_assinado: 'contract_signed',
    },
    returnFields: 'id, name, email, phone, status, substatus, updated_at',
    addUpdatedAt: true,
  },
  tarefas: {
    table: 'tasks',
    allowed: {
      titulo: 'title', descricao: 'description', prazo: 'due_date',
      horario: 'scheduled_time', status: 'status', prioridade: 'priority', categoria: 'category',
    },
    returnFields: 'id, title, status, priority, due_date',
  },
  turmas: {
    table: 'turmas',
    allowed: {
      nome: 'name', data: 'date', hora: 'time', local: 'location', status: 'status',
      meta_alunos: 'student_goal', descricao: 'description', professor: 'professor_name',
      professor_email: 'professor_email', preco: 'price', taxa_matricula: 'enrollment_fee',
    },
    returnFields: 'id, name, date, status',
  },
  matriculas: {
    table: 'lead_class_enrollments',
    allowed: {
      status: 'status', status_quadro: 'board_status', pix_pago: 'pix_completed',
      contrato_assinado: 'contract_signed', valor_recebido: 'valor_recebido',
      taxa_matricula_recebido: 'taxa_matricula_recebido',
    },
    returnFields: 'id, lead_id, class_id, status, board_status, pix_completed, contract_signed',
  },
};

export default async function handler(req: any, res: any) {
  setCors(res, 'PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  const { resource, id } = req.query as { resource: string; id: string };
  const config = RESOURCE_CONFIG[resource];
  if (!config) return res.status(404).json({ error: `Recurso '${resource}' não suporta PUT.` });
  if (!id) return res.status(400).json({ error: 'id é obrigatório.' });

  const body = req.body ?? {};
  const patch: Record<string, any> = {};
  for (const [key, col] of Object.entries(config.allowed)) {
    if (key in body) patch[col] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
  }
  if (config.addUpdatedAt) patch.updated_at = new Date().toISOString();

  try {
    const supabase = getSupabase() as any;
    const { data, error } = await supabase
      .from(config.table)
      .update(patch)
      .eq('id', id)
      .select(config.returnFields)
      .single();
    if (error) throw error;
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
