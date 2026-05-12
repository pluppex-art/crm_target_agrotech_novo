import { getSupabaseClient } from '../lib/supabase';
import { Lead, LeadStatus, LeadSubStatus } from '../types/leads';

export const supabaseService = {
  async getLeads(pipelineId?: string, startDate?: string, endDate?: string): Promise<Lead[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not available');

    let query = supabase
      .from('leads')
      .select('*, lead_class_enrollments(*)')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }

    return data.map((lead: any) => {
      const enrollments = lead.lead_class_enrollments || [];
      // Pegar o enrollment mais recente ou ativo
      const activeEnrollment = enrollments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      return {
        ...lead,
        discount: activeEnrollment?.discount || '',
        discount_applied: activeEnrollment?.discount_applied || false,
        discount_type: activeEnrollment?.discount_type || 'percent',
        pix_completed: activeEnrollment?.pix_completed || false,
        contract_signed: activeEnrollment?.contract_signed || false,
        valor_recebido: activeEnrollment?.valor_recebido || null,
        taxa_matricula_recebido: activeEnrollment?.taxa_matricula_recebido || null,
        forma_pagamento: activeEnrollment?.forma_pagamento || null,
        payment_proof_url: activeEnrollment?.payment_proof_url || null,
        contract_url: activeEnrollment?.contract_url || null,
        professor_proof_url: activeEnrollment?.professor_proof_url || null,
        rg_photo_url: activeEnrollment?.rg_photo_url || null,
        profile_photo_url: activeEnrollment?.profile_photo_url || null,
      } as Lead;
    });
  },

  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating lead status:', error);
      return false;
    }

    return true;
  },

  async updateLeadStage(leadId: string, stageId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('leads')
      .update({ stage_id: stageId })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating lead stage:', error);
      return false;
    }

    return true;
  },

  async updateLeadSubStatus(leadId: string, subStatus: LeadSubStatus | null): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('leads')
      .update({ substatus: subStatus })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating lead sub-status:', error);
      return false;
    }

    return true;
  },

  async createLead(lead: Omit<Lead, 'id'>): Promise<Lead | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Strip extra fields that belong to lead_class_enrollments, not leads
    const { 
      stage, pipeline, subStatus, history, origin,
      discount, discount_applied, discount_type,
      pix_completed, contract_signed,
      valor_recebido, taxa_matricula_recebido, forma_pagamento,
      payment_proof_url, contract_url, professor_proof_url,
      rg_photo_url, profile_photo_url,
      ...baseLead 
    } = lead as any;
    
    const dbLead = {
      ...baseLead,
      substatus: subStatus, // Map subStatus to substatus for database
      lead_source: origin || baseLead.lead_source || null,
    };

    const { data, error } = await supabase
      .from('leads')
      .insert([dbLead])
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return null;
    }

    // Map response back to interface format (DB uses lead_source/substatus; Lead uses origin/subStatus)
    return {
      ...data,
      origin: data.lead_source ?? '',
      subStatus: data.substatus,
    } as unknown as Lead;
  },

  async updateLead(leadId: string, lead: Partial<Omit<Lead, 'id' | 'created_at'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // Strip extra fields that belong to lead_class_enrollments, not leads
    const { 
      stage, pipeline, subStatus, history, origin,
      discount, discount_applied, discount_type,
      pix_completed, contract_signed,
      valor_recebido, taxa_matricula_recebido, forma_pagamento,
      payment_proof_url, contract_url, professor_proof_url,
      rg_photo_url, profile_photo_url,
      ...baseLead 
    } = lead as any;
    
    const dbLead: any = {
      ...baseLead,
      substatus: subStatus, // Map subStatus to substatus for database
    };
    if (origin) {
      dbLead.lead_source = origin;
    }

    const { error } = await supabase
      .from('leads')
      .update(dbLead)
      .eq('id', leadId);

    if (error) {
      console.error('Error updating lead:', error);
      return false;
    }

    // Se houver campos financeiros, atualiza a matrícula (lead_class_enrollments) mais recente
    const financialUpdates: any = {};
    if (discount !== undefined) financialUpdates.discount = discount;
    if (discount_applied !== undefined) financialUpdates.discount_applied = discount_applied;
    if (discount_type !== undefined) financialUpdates.discount_type = discount_type;
    if (pix_completed !== undefined) financialUpdates.pix_completed = pix_completed;
    if (contract_signed !== undefined) financialUpdates.contract_signed = contract_signed;
    if (valor_recebido !== undefined) financialUpdates.valor_recebido = valor_recebido;
    if (taxa_matricula_recebido !== undefined) financialUpdates.taxa_matricula_recebido = taxa_matricula_recebido;
    if (forma_pagamento !== undefined) financialUpdates.forma_pagamento = forma_pagamento;
    if (payment_proof_url !== undefined) financialUpdates.payment_proof_url = payment_proof_url;
    if (contract_url !== undefined) financialUpdates.contract_url = contract_url;
    if (professor_proof_url !== undefined) financialUpdates.professor_proof_url = professor_proof_url;
    if (rg_photo_url !== undefined) financialUpdates.rg_photo_url = rg_photo_url;
    if (profile_photo_url !== undefined) financialUpdates.profile_photo_url = profile_photo_url;

    if (Object.keys(financialUpdates).length > 0) {
      // 1. Achar a matrícula mais recente
      const { data: enrollments } = await supabase
        .from('lead_class_enrollments')
        .select('id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (enrollments && enrollments.length > 0) {
        // 2. Atualizar
        await supabase
          .from('lead_class_enrollments')
          .update(financialUpdates)
          .eq('id', enrollments[0].id);
      }
    }

    return true;
  },

  async checkDuplicateLead(params: {
    phone?: string;
    email?: string;
    cpf?: string;
    cnpj?: string;
    excludeId?: string;
  }): Promise<{ phone: boolean; email: boolean; cpf: boolean; cnpj: boolean }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { phone: false, email: false, cpf: false, cnpj: false };

    const result = { phone: false, email: false, cpf: false, cnpj: false };
    const normalizedPhone = params.phone ? params.phone.replace(/\D/g, '') : '';

    if (normalizedPhone.length >= 10) {
      // Optimized: Check directly in DB instead of fetching all leads
      let query = supabase
        .from('leads')
        .select('id')
        // Using a pattern match or exact match depending on how phone is stored
        .or(`phone.ilike.%${normalizedPhone}%,phone.eq.${params.phone}`);
      
      if (params.excludeId) {
        query = query.neq('id', params.excludeId);
      }

      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        result.phone = true;
      }
    }

    if (params.email?.trim()) {
      let query = supabase
        .from('leads')
        .select('id')
        .ilike('email', params.email.trim());
      
      if (params.excludeId) {
        query = query.neq('id', params.excludeId);
      }

      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        result.email = true;
      }
    }

    if (params.cpf?.trim()) {
      const normalizedCpf = params.cpf.replace(/\D/g, '');
      if (normalizedCpf.length === 11) {
        let query = supabase
          .from('leads')
          .select('id')
          .or(`cpf.ilike.%${normalizedCpf}%,cpf.eq.${params.cpf}`);
        
        if (params.excludeId) {
          query = query.neq('id', params.excludeId);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          result.cpf = true;
        }
      }
    }

    if (params.cnpj?.trim()) {
      const normalizedCnpj = params.cnpj.replace(/\D/g, '');
      if (normalizedCnpj.length >= 11) {
        let query = supabase
          .from('leads')
          .select('id')
          .or(`cnpj.ilike.%${normalizedCnpj}%,cnpj.eq.${params.cnpj}`);
        
        if (params.excludeId) {
          query = query.neq('id', params.excludeId);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          result.cnpj = true;
        }
      }
    }

    return result;
  },

  async deleteLead(leadId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // Cancel all class enrollments for this lead
    await supabase
      .from('lead_class_enrollments')
      .update({ status: 'CANCELLED', removed_at: new Date().toISOString() })
      .eq('lead_id', leadId);

    // Delete associated tasks
    await supabase
      .from('tasks')
      .delete()
      .eq('lead_id', leadId);

    // Delete associated notes
    await supabase
      .from('notes')
      .delete()
      .eq('lead_id', leadId);

    // contracts table no longer exists — skip that deletion step

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) {
      console.error('Error deleting lead:', error);
      return false;
    }

    return true;
  }
};
