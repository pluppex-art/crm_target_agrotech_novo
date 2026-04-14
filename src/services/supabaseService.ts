import { getSupabaseClient } from '../lib/supabase';
import { Lead, LeadStatus, LeadSubStatus } from '../types/leads';

export const supabaseService = {
  async getLeads(pipelineId?: string): Promise<Lead[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }

    return data as Lead[];
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
      .update({ subStatus })
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

    // Strip computed join fields and map field names
    const { stage, pipeline, history, subStatus, ...baseLead } = lead as any;
    const dbLead = {
      ...baseLead,
      substatus: subStatus, // Map subStatus to substatus for database
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

    // Map response back to interface format
    return {
      ...data,
      subStatus: data.substatus,
    } as Lead;
  },

  async updateLead(leadId: string, lead: Partial<Omit<Lead, 'id' | 'created_at'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // Strip computed join fields and map field names
    const { stage, pipeline, history, subStatus, ...baseLead } = lead as any;
    const dbLead = {
      ...baseLead,
      substatus: subStatus, // Map subStatus to substatus for database
    };

    const { error } = await supabase
      .from('leads')
      .update(dbLead)
      .eq('id', leadId);

    if (error) {
      console.error('Error updating lead:', error);
      return false;
    }

    return true;
  },

  async checkDuplicateLead(params: {
    phone?: string;
    email?: string;
    excludeId?: string;
  }): Promise<{ phone: boolean; email: boolean }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { phone: false, email: false };

    const result = { phone: false, email: false };
    const normalizedPhone = params.phone ? params.phone.replace(/\D/g, '') : '';

    if (normalizedPhone.length >= 10) {
      const { data } = await supabase.from('leads').select('id, phone');
      if (data) {
        result.phone = data.some(
          (l) =>
            l.id !== params.excludeId &&
            l.phone &&
            l.phone.replace(/\D/g, '') === normalizedPhone
        );
      }
    }

    if (params.email?.trim()) {
      const { data } = await supabase
        .from('leads')
        .select('id')
        .ilike('email', params.email.trim());
      if (data) {
        result.email = data.some((l) => l.id !== params.excludeId);
      }
    }

    return result;
  },

  async deleteLead(leadId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // Delete associated turma attendees first
    await supabase
      .from('turma_attendees')
      .delete()
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

    // Delete associated contracts
    await supabase
      .from('contracts')
      .delete()
      .eq('lead_id', leadId);

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
