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
  valor_recebido?: number | null;
  forma_pagamento?: string | null;
}

export interface Turma {
  id: string;
  name: string;
  professor_name: string | null;
  professor_email: string | null;
  date: string;
  time: string;
  price?: number;
  enrollment_fee?: number;
  category: string;
  description?: string;
  image_url?: string;
  student_goal?: number;
  location: string;
  meta?: number;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  attendees: TurmaAttendee[];
  capacity?: number;
}

function mapEnrollmentToAttendee(e: any): TurmaAttendee {
  return {
    id: e.id,
    lead_id: e.lead_id ?? undefined,
    name: e.name ?? '',
    photo: e.photo ?? `https://i.pravatar.cc/150?u=${e.id}`,
    responsible: e.responsible ?? '',
    status: (e.board_status ?? 'matriculado') as AttendanceStatus,
    vendas: Number(e.vendas) || 0,
    valor_recebido: e.valor_recebido ?? null,
    forma_pagamento: e.forma_pagamento ?? null,
  };
}

export const turmaService = {
  async getAll(): Promise<Turma[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('turmas')
      .select('*, lead_class_enrollments(*)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching turmas:', error.message);
      return [];
    }

    return (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      professor_name: t.professor_name,
      professor_email: t.professor_email,
      date: t.date,
      time: t.time,
      price: t.price ?? 0,
      enrollment_fee: t.enrollment_fee ?? 0,
      category: t.category ?? 'Geral',
      description: t.description ?? '',
      image_url: t.image_url ?? '',
      student_goal: t.student_goal ?? undefined,
      location: t.location,
      meta: t.meta ?? t.student_goal ?? undefined,
      status: t.status,
      attendees: (t.lead_class_enrollments || [])
        .filter((e: any) => e.status !== 'CANCELLED')
        .map(mapEnrollmentToAttendee),
    }));
  },

  async getAttendeeHistory(leadId: string): Promise<{ turma: Turma; attendee: TurmaAttendee }[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('lead_class_enrollments')
      .select('*, turmas(*)')
      .eq('lead_id', leadId)
      .neq('status', 'CANCELLED');

    if (error) {
      console.error('Error fetching attendee history:', error);
      return [];
    }

    return (data || []).filter(item => item.turmas).map((item: any) => {
      const t = item.turmas;
      return {
        turma: {
          id: t.id,
          name: t.name,
          professor_name: t.professor_name,
          professor_email: t.professor_email,
          date: t.date,
          time: t.time,
          price: t.price ?? 0,
          enrollment_fee: t.enrollment_fee ?? 0,
          category: t.category ?? 'Geral',
          location: t.location,
          status: t.status,
          attendees: [],
        },
        attendee: mapEnrollmentToAttendee(item),
      };
    });
  },

  async addAttendee(turmaId: string, attendee: Omit<TurmaAttendee, 'id'>): Promise<TurmaAttendee | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    if (attendee.lead_id) {
      const { data: existing } = await supabase
        .from('lead_class_enrollments')
        .select('id')
        .eq('class_id', turmaId)
        .eq('lead_id', attendee.lead_id)
        .neq('status', 'CANCELLED');

      if (existing && existing.length > 0) {
        throw new Error('ALREADY_ENROLLED');
      }
    }

    const { data, error } = await supabase
      .from('lead_class_enrollments')
      .insert([{
        class_id: turmaId,
        lead_id: attendee.lead_id ?? null,
        status: 'ENROLLED',
        board_status: attendee.status || 'matriculado',
        name: attendee.name || '',
        photo: attendee.photo || '',
        responsible: attendee.responsible || '',
        vendas: Number(attendee.vendas) || 0,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding attendee:', error);
      return null;
    }

    return mapEnrollmentToAttendee(data);
  },

  async updateAttendeeStatus(attendeeId: string, status: AttendanceStatus): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('lead_class_enrollments')
      .update({ board_status: status })
      .eq('id', attendeeId);

    if (error) {
      console.error('Error updating attendee status:', error);
      return false;
    }
    return true;
  },

  async create(turmaData: Omit<Turma, 'id' | 'attendees'>): Promise<Turma | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('turmas')
      .insert([{
        name: turmaData.name,
        price: turmaData.price ?? null,
        enrollment_fee: turmaData.enrollment_fee ?? null,
        category: turmaData.category ?? null,
        description: turmaData.description ?? null,
        image_url: turmaData.image_url ?? null,
        student_goal: turmaData.student_goal ?? null,
        professor_name: turmaData.professor_name || null,
        professor_email: turmaData.professor_email || null,
        date: turmaData.date || null,
        time: turmaData.time || null,
        location: turmaData.location || null,
        status: turmaData.status,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating turma:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      professor_name: data.professor_name,
      professor_email: data.professor_email,
      date: data.date,
      time: data.time,
      price: data.price ?? 0,
      enrollment_fee: data.enrollment_fee ?? 0,
      category: data.category ?? 'Geral',
      location: data.location,
      status: data.status,
      attendees: [],
    };
  },

  async update(id: string, turmaData: Partial<Omit<Turma, 'id' | 'attendees'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const sanitized: any = { ...turmaData };

    if ('date' in sanitized) sanitized.date = sanitized.date || null;
    if ('time' in sanitized) sanitized.time = sanitized.time || null;
    if ('location' in sanitized) sanitized.location = sanitized.location || null;
    if ('professor_name' in sanitized) sanitized.professor_name = sanitized.professor_name || null;
    if ('professor_email' in sanitized) sanitized.professor_email = sanitized.professor_email || null;

    const { error } = await supabase
      .from('turmas')
      .update(sanitized)
      .eq('id', id);

    if (error) {
      console.error('Error updating turma:', error);
      return false;
    }

    if (turmaData.status === 'concluida') {
      try {
        const { data: currentTurma } = await supabase
          .from('turmas')
          .select('date')
          .eq('id', id)
          .single();

        if (currentTurma?.date) {
          const now = new Date();
          const turmaDate = new Date(currentTurma.date + 'T12:00:00');
          const isSameMonth = now.getMonth() === turmaDate.getMonth() && now.getFullYear() === turmaDate.getFullYear();

          const { data: enrollments } = await supabase
            .from('lead_class_enrollments')
            .select('lead_id')
            .eq('class_id', id)
            .neq('status', 'CANCELLED')
            .not('lead_id', 'is', null);

          if (enrollments && enrollments.length > 0) {
            const leadIds = (enrollments as any[]).map(e => e.lead_id).filter(Boolean);

            if (leadIds.length > 0) {
              const updates: any = { substatus: 'Turma Concluída' };

              if (!isSameMonth) {
                const { data: stage } = await supabase
                  .from('pipeline_stages')
                  .select('id')
                  .eq('name', 'Turma Concluido')
                  .limit(1)
                  .maybeSingle();

                if (stage?.id) {
                  updates.stage_id = stage.id;
                }
              }

              await supabase
                .from('leads')
                .update(updates)
                .in('id', leadIds);

              console.log(`[turmaService] Automation run for ${leadIds.length} leads. isSameMonth: ${isSameMonth}`);
            }
          }
        }
      } catch (autoErr) {
        console.error('Error in Turma Concluída automation:', autoErr);
      }
    }

    return true;
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('turmas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting turma:', error);
      return false;
    }
    return true;
  },

  async deleteTurma(id: string): Promise<boolean> {
    return turmaService.remove(id);
  },

  async updateAttendeePayment(attendeeId: string, valor_recebido: number | null, forma_pagamento: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('lead_class_enrollments')
      .update({ valor_recebido: valor_recebido ?? null, forma_pagamento: forma_pagamento || null })
      .eq('id', attendeeId);

    if (error) {
      console.error('Error updating attendee payment:', error);
      return false;
    }
    return true;
  },

  async removeAttendee(attendeeId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('lead_class_enrollments')
      .update({ status: 'CANCELLED', removed_at: new Date().toISOString() })
      .eq('id', attendeeId);

    if (error) {
      console.error('Error removing attendee:', error);
      return false;
    }
    return true;
  },

  async updateAttendeeVendas(leadId: string, vendas: number): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('lead_class_enrollments')
      .update({ vendas })
      .eq('lead_id', leadId)
      .neq('status', 'CANCELLED');

    if (error) {
      console.error('Error updating attendee vendas:', error);
      return false;
    }
    return true;
  },
};
