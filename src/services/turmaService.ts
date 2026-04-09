import { getSupabaseClient } from '../lib/supabase';

export type AttendanceStatus = 'matriculado' | 'confirmado' | 'indeciso' | 'cancelado';

export interface TurmaAttendee {
  id: string;
  lead_id?: string;
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
        lead_id: a.lead_id ?? undefined,
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

  async addAttendee(turmaId: string, attendee: Omit<TurmaAttendee, 'id'>): Promise<TurmaAttendee | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Block duplicate enrollment
    if (attendee.lead_id) {
      const { data: existing } = await supabase
        .from('turma_attendees')
        .select('id')
        .eq('turma_id', turmaId)
        .eq('lead_id', attendee.lead_id);
      if (existing && existing.length > 0) {
        throw new Error('ALREADY_ENROLLED');
      }
    }

    const validStatuses: AttendanceStatus[] = ['matriculado', 'confirmado', 'indeciso', 'cancelado'];
    const status = validStatuses.includes(attendee.status) ? attendee.status : 'indeciso';

    const payload = {
      turma_id: turmaId,
      lead_id: attendee.lead_id ?? null,
      name: attendee.name || '',
      photo: attendee.photo || '',
      responsible: attendee.responsible || '',
      status: status,
      vendas: Number(attendee.vendas) || 0,
    };

    console.log('Adding attendee with payload:', payload);

    const { data, error } = await supabase
      .from('turma_attendees')
      .insert([payload])
      .select()
      .single();

    if (error) { console.error('Error adding attendee:', error.message, error.details, 'Payload:', payload); return null; }

    return {
      id: data.id,
      lead_id: data.lead_id ?? undefined,
      name: data.name ?? '',
      photo: data.photo ?? `https://i.pravatar.cc/150?u=${data.id}`,
      responsible: data.responsible ?? '',
      status: data.status as AttendanceStatus,
      vendas: Number(data.vendas) || 0,
    };
  },

  async removeAttendee(attendeeId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('turma_attendees')
      .delete()
      .eq('id', attendeeId);

    if (error) { console.error('Error removing attendee:', error.message, error.details); return false; }
    return true;
  },

  async getTurmasByLeadId(leadId: string): Promise<{ turma: Turma; attendee: TurmaAttendee }[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('turma_attendees')
      .select('*, turmas(*)')
      .eq('lead_id', leadId);

    if (error) { console.error('Error fetching turmas by lead:', error.message); return []; }

    return (data || []).map((row: any) => ({
      turma: {
        id: row.turmas.id,
        name: row.turmas.name,
        professor_name: row.turmas.professor_name,
        professor_email: row.turmas.professor_email,
        date: row.turmas.date,
        time: row.turmas.time,
        product: row.turmas.product_name ?? row.turmas.product ?? '',
        location: row.turmas.location,
        status: row.turmas.status,
        attendees: [],
      },
      attendee: {
        id: row.id,
        lead_id: row.lead_id ?? undefined,
        name: row.name ?? '',
        photo: row.photo ?? '',
        responsible: row.responsible ?? '',
        status: row.status as AttendanceStatus,
        vendas: Number(row.vendas) || 0,
      },
    }));
  },
};
