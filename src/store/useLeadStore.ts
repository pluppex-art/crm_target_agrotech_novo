import { create } from 'zustand';
import { Lead, LeadStatus, LeadSubStatus } from '../types/leads';
import { MOCK_LEADS } from '../constants/leads';
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
  addLead: (lead: Omit<Lead, 'id' | 'created_at'>) => Promise<void>;
}

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: MOCK_LEADS, // Initial state with mock data
  selectedLead: null,
  isLoading: false,
  error: null,

  fetchLeads: async () => {
    set({ isLoading: true, error: null });
    try {
      const leads = await supabaseService.getLeads();
      if (leads.length > 0) {
        set({ leads, isLoading: false });
      } else {
        // If no data in Supabase, keep mock data but stop loading
        set({ isLoading: false });
      }
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
}));
