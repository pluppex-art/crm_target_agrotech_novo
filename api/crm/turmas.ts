import { getSupabase, setCors, checkAuth } from '../_lib/crm';

export default async function handler(req: any, res: any) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req, res)) return;

  try {
    const supabase = getSupabase() as any;
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
        id: t.id,
        nome: t.name,
        categoria: t.category ?? null,
        data: t.date ?? null,
        hora: t.time ?? null,
        local: t.location ?? null,
        preco: Number(t.price) || 0,
        taxa_matricula: Number(t.enrollment_fee) || 0,
        professor: t.professor_name ?? null,
        professor_email: t.professor_email ?? null,
        descricao: t.description ?? null,
        status: t.status ?? null,
        meta_alunos: t.student_goal ?? null,
        total_matriculas: enrollmentCount.get(t.id) ?? 0,
        criado_em: t.created_at,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
