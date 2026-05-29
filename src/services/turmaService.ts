import { getSupabaseClient } from '../lib/supabase';

export type AttendanceStatus = 'matriculado' | 'confirmado' | 'indeciso' | 'cancelado';

export interface TurmaAttendee {
  id: string;
  lead_id?: string;
  responsavel_usuario_id?: string | null;
  name: string;
  photo: string;
  responsible: string;
  status: AttendanceStatus;
  vendas: number;
  valor_recebido?: number | null;
  forma_pagamento?: string | null;
  taxa_matricula_recebido?: number | null;
  taxa_matricula_paid_at?: string | null;
  valor_recebido_paid_at?: string | null;
  seller_origin?: 'target' | 'pluppex' | null;
  cost_center?: 'cursos' | 'servico_drone' | 'administrativo' | null;
  pix_completed?: boolean;
  contract_signed?: boolean;
  payment_proof_url?: string | null;
  contract_url?: string | null;
  professor_proof_url?: string | null;
  discount?: string | null;
  discount_applied?: boolean;
  discount_type?: 'percent' | 'fixed';
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
    taxa_matricula_recebido: e.taxa_matricula_recebido ?? null,
    taxa_matricula_paid_at: e.taxa_matricula_paid_at ?? null,
    valor_recebido_paid_at: e.valor_recebido_paid_at ?? null,
    seller_origin: e.seller_origin ?? null,
    cost_center: e.cost_center ?? null,
    pix_completed: e.pix_completed ?? false,
    contract_signed: e.contract_signed ?? false,
    payment_proof_url: e.payment_proof_url ?? null,
    contract_url: e.contract_url ?? null,
    professor_proof_url: e.professor_proof_url ?? null,
    discount: e.discount ?? null,
    discount_applied: e.discount_applied ?? false,
    discount_type: e.discount_type ?? 'percent',
  };
}

async function findStageByPattern(patterns: string[]): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  for (const pattern of patterns) {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('id')
      .ilike('name', pattern)
      .eq('is_active', true)
      .order('position')
      .limit(1);

    if (data && data.length > 0) {
      return data[0].id;
    }
  }
  return null;
}

export const turmaService = {
  async getAll(): Promise<Turma[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('turmas')
      .select('*, lead_class_enrollments!class_id(*)')
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
      .select('*, turmas!class_id(*)')
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
        responsavel_usuario_id: attendee.responsavel_usuario_id ?? null,
        status: 'ENROLLED',
        board_status: attendee.status || 'matriculado',
        name: attendee.name || '',
        photo: attendee.photo || '',
        responsible: attendee.responsible || '',
        vendas: Number(attendee.vendas) || 0,
        seller_origin: attendee.seller_origin || null,
        cost_center: attendee.cost_center || null,
        pix_completed: attendee.pix_completed ?? false,
        contract_signed: attendee.contract_signed ?? false,
        payment_proof_url: attendee.payment_proof_url ?? null,
        contract_url: attendee.contract_url ?? null,
        professor_proof_url: attendee.professor_proof_url ?? null,
        discount: attendee.discount ?? null,
        discount_applied: attendee.discount_applied ?? false,
        discount_type: attendee.discount_type ?? 'percent',
        valor_recebido: attendee.valor_recebido ?? null,
        forma_pagamento: attendee.forma_pagamento ?? null,
        taxa_matricula_recebido: attendee.taxa_matricula_recebido ?? null,
        taxa_matricula_paid_at: attendee.taxa_matricula_paid_at ?? null,
        valor_recebido_paid_at: attendee.valor_recebido_paid_at ?? null,
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

    try {
      const { data: enrollment } = await supabase
        .from('lead_class_enrollments')
        .select('lead_id, status, class_id, turmas:turmas!lead_class_enrollments_class_id_fkey(status)')
        .eq('id', attendeeId)
        .single();

      if (enrollment?.lead_id && enrollment?.status !== 'CANCELLED') {
        const isConcluded = (enrollment as any).turmas?.status === 'concluida';

        if (isConcluded) {
          if (status === 'confirmado') {
            const stageId = await findStageByPattern([
              '%Turma Conclu%',
              '%Conclu%'
            ]);
            const updates: any = { substatus: 'Turma Concluída' };
            if (stageId) updates.stage_id = stageId;

            await supabase.from('leads').update(updates).eq('id', enrollment.lead_id);
          } else if (status === 'cancelado') {
            const stageId = await findStageByPattern([
              '%Não Compareceu%',
              '%Nao Compareceu%',
              '%Compareceu%'
            ]);
            const updates: any = { substatus: 'Não Compareceu' };
            if (stageId) updates.stage_id = stageId;

            await supabase.from('leads').update(updates).eq('id', enrollment.lead_id);
          } else {
            // Mapeia de volta para Ganho se for matriculado ou outro em turma concluída
            const stageId = await findStageByPattern(['%Ganho%']);
            const updates: any = { substatus: null };
            if (stageId) updates.stage_id = stageId;

            await supabase.from('leads').update(updates).eq('id', enrollment.lead_id);
          }
        } else {
          // Se a turma NÃO está concluída, mas o aluno foi cancelado
          if (status === 'cancelado') {
            const stageId = await findStageByPattern([
              '%Não Compareceu%',
              '%Nao Compareceu%',
              '%Compareceu%'
            ]);
            const updates: any = { substatus: 'Não Compareceu' };
            if (stageId) updates.stage_id = stageId;

            await supabase.from('leads').update(updates).eq('id', enrollment.lead_id);
          }
        }
      }
    } catch (autoErr) {
      console.error('Error in Attendee Status Change automation:', autoErr);
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
      status: data.status as Turma['status'],
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
        // 1. Move CONFIRMED active attendees to "Turma Concluída"
        const { data: confirmedEnrollments } = await supabase
          .from('lead_class_enrollments')
          .select('lead_id')
          .eq('class_id', id)
          .eq('board_status', 'confirmado')
          .neq('status', 'CANCELLED')
          .not('lead_id', 'is', null);

        if (confirmedEnrollments && confirmedEnrollments.length > 0) {
          const leadIds = (confirmedEnrollments as any[]).map(e => e.lead_id).filter(Boolean);

          if (leadIds.length > 0) {
            const stageId = await findStageByPattern([
              '%Turma Conclu%',
              '%Conclu%'
            ]);

            const updates: any = { substatus: 'Turma Concluída' };
            if (stageId) {
              updates.stage_id = stageId;
            }

            await supabase
              .from('leads')
              .update(updates)
              .in('id', leadIds);

            console.log(`[turmaService] Automation: Moved ${leadIds.length} confirmed leads to stage ${stageId || 'default'} ('Turma Concluída')`);
          }
        }

        // 2. Move CANCELLED attendees of this class to "Não Compareceu"
        const { data: otherEnrollments } = await supabase
          .from('lead_class_enrollments')
          .select('lead_id, board_status, status')
          .eq('class_id', id)
          .eq('board_status', 'cancelado')
          .neq('status', 'CANCELLED')
          .not('lead_id', 'is', null);

        if (otherEnrollments && otherEnrollments.length > 0) {
          const cancelledLeads = (otherEnrollments as any[])
            .map(e => e.lead_id)
            .filter(Boolean);

          if (cancelledLeads.length > 0) {
            const stageId = await findStageByPattern([
              '%Não Compareceu%',
              '%Nao Compareceu%',
              '%Compareceu%'
            ]);

            // Avoid moving them to "Não Compareceu" if they have an active confirmed enrollment in another class
            const { data: activeConfirmed } = await supabase
              .from('lead_class_enrollments')
              .select('lead_id')
              .in('lead_id', cancelledLeads)
              .eq('board_status', 'confirmado')
              .neq('status', 'CANCELLED');

            const activeConfirmedLeadIds = new Set((activeConfirmed || []).map(e => e.lead_id));
            const finalLeadsToMove = cancelledLeads.filter(leadId => !activeConfirmedLeadIds.has(leadId));

            if (finalLeadsToMove.length > 0) {
              const updates: any = { substatus: 'Não Compareceu' };
              if (stageId) {
                updates.stage_id = stageId;
              }

              await supabase
                .from('leads')
                .update(updates)
                .in('id', finalLeadsToMove);

              console.log(`[turmaService] Automation: Moved ${finalLeadsToMove.length} cancelled leads to stage ${stageId || 'default'} ('Não Compareceu')`);
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

  async updateAttendeePayment(
    attendeeId: string,
    valor_recebido: number | null,
    forma_pagamento: string,
    valor_recebido_paid_at?: string | null
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const updates: Record<string, any> = {
      valor_recebido: valor_recebido ?? null,
      forma_pagamento: forma_pagamento || null,
    };
    if (valor_recebido_paid_at !== undefined) {
      updates.valor_recebido_paid_at = valor_recebido_paid_at || null;
    }

    const { error } = await supabase
      .from('lead_class_enrollments')
      .update(updates)
      .eq('id', attendeeId);

    if (error) {
      console.error('Error updating attendee payment:', error);
      return false;
    }
    return true;
  },

  async updateEnrollmentDates(
    enrollmentId: string,
    dates: { taxa_matricula_paid_at?: string | null; valor_recebido_paid_at?: string | null }
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('lead_class_enrollments')
      .update(dates)
      .eq('id', enrollmentId);

    if (error) {
      console.error('Error updating enrollment dates:', error);
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

  async enrollLeadInTurma(leadData: any): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // 1. Tentar achar uma turma ativa
    const { data: turmas, error: fetchError } = await supabase
      .from('turmas')
      .select('id')
      .neq('status', 'concluida')
      .neq('status', 'cancelada')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !turmas || turmas.length === 0) {
      console.warn('Nenhuma turma ativa encontrada para auto-matrícula do lead Ganho.');
      return false;
    }

    const classId = turmas[0].id;

    // 2. Inserir a matrícula com os dados financeiros
    const { error: insertError } = await supabase
      .from('lead_class_enrollments')
      .insert([{
        class_id: classId,
        lead_id: leadData.id,
        responsavel_usuario_id: leadData.responsavel_usuario_id,
        status: 'ENROLLED',
        discount: leadData.discount || null,
        discount_applied: leadData.discount_applied || false,
        discount_type: leadData.discount_type || 'percent',
        pix_completed: leadData.pix_completed || false,
        contract_signed: leadData.contract_signed || false,
        taxa_matricula_recebido: leadData.taxa_matricula_recebido || null,
        valor_recebido: leadData.valor_recebido || null,
        valor_recebido_paid_at: leadData.valor_recebido_paid_at || null,
        forma_pagamento: leadData.forma_pagamento || null,
        payment_proof_url: leadData.payment_proof_url || null,
        contract_url: leadData.contract_url || null,
        professor_proof_url: leadData.professor_proof_url || null,
        name: leadData.name || '',
        photo: leadData.photo || '',
        responsible: leadData.responsible || '',
        vendas: Number(leadData.vendas) || 0,
        seller_origin: leadData.seller_origin || null,
        cost_center: leadData.cost_center || null,
      }]);

    if (insertError) {
      console.error('Erro na auto-matrícula do lead Ganho:', insertError);
      return false;
    }

    return true;
  },
};
