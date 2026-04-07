import { getSupabaseClient } from '../lib/supabase';
import { Lead, LeadStatus, LeadSubStatus } from '../types/leads';

export const supabaseService = {
  async getLeads(): Promise<Lead[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

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

    const { data, error } = await supabase
      .from('leads')
      .insert([lead])
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return null;
    }

    return data as Lead;
  },

  async updateLead(leadId: string, lead: Partial<Omit<Lead, 'id' | 'created_at'>>): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('leads')
      .update(lead)
      .eq('id', leadId);

    if (error) {
      console.error('Error updating lead:', error);
      return false;
    }

    return true;
  },

  async deleteLead(leadId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // Delete associated tasks first
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
  },

  // === Turmas Methods ===
  async getTurmas(): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('turmas')
      .select('*, turma_attendees(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching turmas:', error);
      return [];
    }

    return data || [];
  },

  async createTurma(turma: any): Promise<any | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('turmas')
      .insert([turma])
      .select()
      .single();

    if (error) {
      console.error('Error creating turma:', error);
      return null;
    }

    return data;
  },

  async updateTurma(turmaId: string, turma: any): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('turmas')
      .update(turma)
      .eq('id', turmaId);

    if (error) {
      console.error('Error updating turma:', error);
      return false;
    }

    return true;
  },

  async deleteTurma(turmaId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('turmas')
      .delete()
      .eq('id', turmaId);

    if (error) {
      console.error('Error deleting turma:', error);
      return false;
    }

    return true;
  },

  async addAttendee(turmaId: string, attendee: any): Promise<any | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('turma_attendees')
      .insert([{ ...attendee, turma_id: turmaId }])
      .select()
      .single();

    if (error) {
      console.error('Error adding attendee:', error);
      return null;
    }

    return data;
  },

  async updateAttendeeStatus(attendeeId: string, status: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('turma_attendees')
      .update({ status })
      .eq('id', attendeeId);

    if (error) {
      console.error('Error updating attendee status:', error);
      return false;
    }

    return true;
  }
};
