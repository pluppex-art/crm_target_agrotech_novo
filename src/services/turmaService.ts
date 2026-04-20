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
  product_id: string;
  product_name: string;   // From join
  product_price?: number; // From join
  enrollment_fee?: number; // From join
  category: string;       // From join
  location: string;
  capacity?: number;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  attendees: TurmaAttendee[];
}

export const turmaService = {
  async getAll(): Promise<Turma[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('turmas')
      .select('*, products(*), turma_attendees(*)')
      .order('created_at', { ascending: false });

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
      product_id: t.product_id,
      product_name: t.products?.name ?? 'Produto não encontrado',
      product_price: t.products?.price ?? 0,
      enrollment_fee: t.products?.enrollment_fee ?? 0,
      category: t.products?.category ?? 'Geral',
      location: t.location,
      capacity: t.capacity ?? 20,
      status: t.status,
      attendees: (t.turma_attendees || []).map((a: any) => ({
        id: a.id,
        lead_id: a.lead_id ?? undefined,
        name: a.name ?? '',
        photo: a.photo ?? `https://i.pravatar.cc/150?u=${a.id}`,
        responsible: a.responsible ?? '',
        status: a.status as AttendanceStatus,
        vendas: Number(a.vendas) || 0,
        valor_recebido: a.valor_recebido ?? null,
        forma_pagamento: a.forma_pagamento ?? null,
      })),
    }));
  },

  async getAttendeeHistory(leadId: string): Promise<{ turma: Turma; attendee: TurmaAttendee }[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('turma_attendees')
      .select('*, turmas(*, products(*))')
      .eq('lead_id', leadId);

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
          product_id: t.product_id,
          product_name: t.products?.name ?? 'Produto não encontrado',
          product_price: t.products?.price ?? 0,
          enrollment_fee: t.products?.enrollment_fee ?? 0,
          category: t.products?.category ?? 'Geral',
          location: t.location,
          status: t.status,
          attendees: [],
        },
        attendee: {
          id: item.id,
          lead_id: item.lead_id,
          name: item.name,
          photo: item.photo ?? `https://i.pravatar.cc/150?u=${item.id}`,
          responsible: item.responsible,
          status: item.status as AttendanceStatus,
          vendas: Number(item.vendas) || 0,
          valor_recebido: item.valor_recebido ?? null,
          forma_pagamento: item.forma_pagamento ?? null,
        }
      };
    });
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

    const { data, error } = await supabase
      .from('turma_attendees')
      .insert([{
        turma_id: turmaId,
        lead_id: attendee.lead_id ?? null,
        name: attendee.name || '',
        photo: attendee.photo || '',
        responsible: attendee.responsible || '',
        status: attendee.status || 'indeciso',
        vendas: Number(attendee.vendas) || 0,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding attendee:', error);
      return null;
    }

    return {
      id: data.id,
      lead_id: data.lead_id,
      name: data.name,
      photo: data.photo,
      responsible: data.responsible,
      status: data.status as AttendanceStatus,
      vendas: data.vendas,
    };
  },

  async updateAttendeeStatus(attendeeId: string, status: AttendanceStatus): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('turma_attendees')
      .update({ status })
      .eq('id', attendeeId);

    if (error) {
      console.error('Error updating attendee:', error);
      return false;
    }
    return true;
  },

  async create(turmaData: Omit<Turma, 'id' | 'attendees' | 'product_name' | 'category'>): Promise<Turma | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('turmas')
      .insert([{
        name: turmaData.name,
        product_id: turmaData.product_id,
        professor_name: turmaData.professor_name || null,
        professor_email: turmaData.professor_email || null,
        date: turmaData.date || null,
        time: turmaData.time || null,
        location: turmaData.location || null,
        status: turmaData.status,
      }])
      .select('*, products(*), turma_attendees(*)')
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
      product_id: data.product_id,
      product_name: data.products?.name ?? 'Produto não encontrado',
      category: data.products?.category ?? 'Geral',
      location: data.location,
      status: data.status,
      attendees: [],
    };
  },

  async update(id: string, turmaData: Partial<Omit<Turma, 'id' | 'attendees' | 'product_name' | 'category'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const sanitized = {
      ...turmaData,
      date: turmaData.date || null,
      time: turmaData.time || null,
      location: turmaData.location || null,
      professor_name: turmaData.professor_name || null,
      professor_email: turmaData.professor_email || null,
    };

    const { error } = await supabase
      .from('turmas')
      .update(sanitized)
      .eq('id', id);

    if (error) {
      console.error('Error updating turma:', error);
      return false;
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
      .from('turma_attendees')
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
      .from('turma_attendees')
      .delete()
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
      .from('turma_attendees')
      .update({ vendas })
      .eq('lead_id', leadId);

    if (error) {
      console.error('Error updating attendee vendas:', error);
      return false;
    }
    return true;
  },
};
