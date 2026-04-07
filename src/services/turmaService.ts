import { getSupabaseClient } from '../lib/supabase';

export type AttendanceStatus = 'confirmado' | 'indeciso' | 'cancelado';

export interface TurmaAttendee {
  id: string;
  name: string;
  photo: string;
  responsible: string;
  status: AttendanceStatus;
  vendas: number;
}

export interface Turma {
  id: string;
  name: string;
  professor_name: string | null;
  professor_email: string | null;
  date: string;
  time: string;
  product: string;
  location: string;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  attendees: TurmaAttendee[];
}

// ─── Supabase helpers ────────────────────────────────────────────────────────

export const turmaService = {
  async getAll(): Promise<Turma[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('turmas')
      .select('*, turma_attendees(*)')
      .order('created_at', { ascending: false });

    if (error) { console.error('Error fetching turmas:', error.message, error.details); return []; }

    return (data || []).map((t: any) => ({
      ...t,
      product: t.product_name ?? t.product ?? '',
      attendees: (t.turma_attendees || []).map((a: any) => ({
        id: a.id,
        name: a.name ?? '',
        photo: a.photo ?? `https://i.pravatar.cc/150?u=${a.id}`,
        responsible: a.responsible ?? '',
        status: a.status as AttendanceStatus,
        vendas: Number(a.vendas) || 0,
      })),
    }));
  },

  async create(turma: Omit<Turma, 'id' | 'attendees'>): Promise<Turma | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const payload = {
      name: turma.name,
      professor_name: turma.professor_name || null,
      professor_email: turma.professor_email || null,
      date: turma.date || null,
      time: turma.time || null,
      product_name: turma.product,
      location: turma.location || null,
      status: turma.status ?? 'agendada',
    };

    const { data, error } = await supabase
      .from('turmas')
      .insert([payload])
      .select()
      .single();

    if (error) { console.error('Error creating turma:', error.message, error.details); return null; }

    return { ...data, product: data.product_name ?? '', attendees: [] };
  },

  async update(turmaId: string, turma: Partial<Omit<Turma, 'id' | 'attendees'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const payload: any = { ...turma };
    if (turma.product !== undefined) { payload.product_name = turma.product; delete payload.product; }

    const { error } = await supabase.from('turmas').update(payload).eq('id', turmaId);
    if (error) { console.error('Error updating turma:', error.message, error.details); return false; }
    return true;
  },

  async remove(turmaId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase.from('turmas').delete().eq('id', turmaId);
    if (error) { console.error('Error deleting turma:', error.message, error.details); return false; }
    return true;
  },

  async updateAttendeeStatus(attendeeId: string, status: AttendanceStatus): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('turma_attendees')
      .update({ status })
      .eq('id', attendeeId);

    if (error) { console.error('Error updating attendee:', error.message, error.details); return false; }
    return true;
  },
};
