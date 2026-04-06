import { create } from 'zustand';
import { Lead, LeadStatus, LeadSubStatus } from '../types/leads';
import { supabaseService } from '../services/supabaseService';

interface LeadStore {
  leads: Lead[];
  selectedLead: Lead | null;
  isLoading: boolean;
  error: string | null;
  fetchLeads: () => Promise<void>;
  setLeads: (leads: Lead[]) => void;
  setSelectedLead: (lead: Lead | null) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  updateLeadSubStatus: (leadId: string, subStatus: LeadSubStatus | null) => Promise<void>;
  updateLead: (leadId: string, lead: Partial<Omit<Lead, 'id' | 'created_at'>>) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'created_at'>) => Promise<void>;
}

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: [], // Start empty
  selectedLead: null,
  isLoading: false,
  error: null,

  fetchLeads: async () => {
    set({ isLoading: true, error: null });
    try {
      const leads = await supabaseService.getLeads();
      set({ leads, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch leads from Supabase', isLoading: false });
    }
  },

  setLeads: (leads) => set({ leads }),
  setSelectedLead: (lead) => set({ selectedLead: lead }),

  addLead: async (leadData) => {
    set({ isLoading: true, error: null });
    try {
      const newLead = await supabaseService.createLead(leadData as any);
      if (newLead) {
        set((state) => ({ leads: [newLead, ...state.leads], isLoading: false }));
      }
    } catch (err) {
      set({ error: 'Failed to add lead', isLoading: false });
    }
  },

  updateLeadStatus: async (leadId, status) => {
    // Optimistic update
    const previousLeads = get().leads;
    set((state) => ({
      leads: state.leads.map(lead => lead.id === leadId ? { ...lead, status, subStatus: status === 'qualified' ? lead.subStatus : undefined } : lead)
    }));

    try {
      const success = await supabaseService.updateLeadStatus(leadId, status);
      if (!success) {
        // Revert on failure
        set({ leads: previousLeads, error: 'Failed to update lead status in Supabase' });
      }
    } catch (err) {
      set({ leads: previousLeads, error: 'Failed to update lead status in Supabase' });
    }
  },

  updateLeadSubStatus: async (leadId, subStatus) => {
    // Optimistic update
    const previousLeads = get().leads;
    set((state) => ({
      leads: state.leads.map(lead => lead.id === leadId ? { ...lead, subStatus } : lead)
    }));

    try {
      const success = await supabaseService.updateLeadSubStatus(leadId, subStatus);
      if (!success) {
        // Revert on failure
        set({ leads: previousLeads, error: 'Failed to update lead sub-status in Supabase' });
      }
    } catch (err) {
      set({ leads: previousLeads, error: 'Failed to update lead sub-status in Supabase' });
    }
  },

  updateLead: async (leadId, leadData) => {
    // Optimistic update
    const previousLeads = get().leads;
    set((state) => ({
      leads: state.leads.map(lead => lead.id === leadId ? { ...lead, ...leadData } : lead)
    }));

    try {
      const success = await supabaseService.updateLead(leadId, leadData);
      if (!success) {
        // Revert on failure
        set({ leads: previousLeads, error: 'Failed to update lead in Supabase' });
      }
    } catch (err) {
      set({ leads: previousLeads, error: 'Failed to update lead in Supabase' });
    }
  },

  deleteLead: async (leadId) => {
    // Optimistic update
    const previousLeads = get().leads;
    set((state) => ({
      leads: state.leads.filter(lead => lead.id !== leadId)
    }));

    try {
      const success = await supabaseService.deleteLead(leadId);
      if (!success) {
        // Revert on failure
        set({ leads: previousLeads, error: 'Failed to delete lead in Supabase' });
      }
    } catch (err) {
      set({ leads: previousLeads, error: 'Failed to delete lead in Supabase' });
    }
  },
}));
