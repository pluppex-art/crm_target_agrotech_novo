import { create } from 'zustand';
import { Lead, LeadStatus, LeadSubStatus } from '../types/leads';
import { supabaseService } from '../services/supabaseService';
import { getSupabaseClient } from '../lib/supabase';

interface LeadStore {
  leads: Lead[];
  selectedLead: Lead | null;
  isLoading: boolean;
  error: string | null;
  fetchLeads: (pipelineId?: string) => Promise<void>;
  setLeads: (leads: Lead[]) => void;
  setSelectedLead: (lead: Lead | null) => void;
  updateLeadStage: (leadId: string, stageId: string) => Promise<boolean>;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<boolean>;
  updateLeadSubStatus: (leadId: string, subStatus: LeadSubStatus | null) => Promise<boolean>;
  updateLead: (leadId: string, lead: Partial<Omit<Lead, 'id' | 'created_at'>>) => Promise<boolean>;
  deleteLead: (leadId: string) => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'created_at'>) => Promise<Lead | undefined>;
  subscribeToLeads: (pipelineId?: string) => () => void;
}

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: [], // Start empty
  selectedLead: null,
  isLoading: false,
  error: null,

  fetchLeads: async (pipelineId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const leads = await supabaseService.getLeads(pipelineId);
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
        return newLead;
      }
    } catch (err) {
      set({ error: 'Failed to add lead', isLoading: false });
    }
    return undefined;
  },

  updateLeadStage: async (leadId: string, stageId: string) => {
    const previousLeads = get().leads;
    set((state) => ({
      leads: state.leads.map(lead => lead.id === leadId ? { ...lead, stage_id: stageId } : lead),
      selectedLead: state.selectedLead?.id === leadId ? { ...state.selectedLead, stage_id: stageId } : state.selectedLead
    }));

    try {
      const success = await supabaseService.updateLeadStage(leadId, stageId);
      if (!success) {
        set({ leads: previousLeads, error: 'Failed to update lead stage' });
        return false;
      }
      return true;
    } catch (err) {
      set({ leads: previousLeads, error: 'Failed to update lead stage' });
      return false;
    }
  },

  updateLeadStatus: async (leadId, status) => {
    // Legacy - will be deprecated
    const previousLeads = get().leads;
    set((state) => ({
      leads: state.leads.map(lead => lead.id === leadId ? { ...lead, status, subStatus: status === 'qualified' ? lead.subStatus ?? null : null } : lead),
      selectedLead: state.selectedLead?.id === leadId ? { ...state.selectedLead, status, subStatus: status === 'qualified' ? state.selectedLead.subStatus ?? null : null } : state.selectedLead
    }));

    try {
      const success = await supabaseService.updateLeadStatus(leadId, status);
      if (!success) {
        set({ leads: previousLeads, error: 'Failed to update lead status' });
        return false;
      }
      return true;
    } catch (err) {
      set({ leads: previousLeads, error: 'Failed to update lead status' });
      return false;
    }
  },

  updateLeadSubStatus: async (leadId, subStatus) => {
    // Optimistic update
    const previousLeads = get().leads;
    set((state) => ({
      leads: state.leads.map(lead => lead.id === leadId ? { ...lead, subStatus: subStatus ?? null } : lead),
      selectedLead: state.selectedLead?.id === leadId ? { ...state.selectedLead, subStatus: subStatus ?? null } : state.selectedLead
    }));

    try {
      const success = await supabaseService.updateLeadSubStatus(leadId, subStatus);
      if (!success) {
        // Revert on failure
        set({ leads: previousLeads, error: 'Failed to update lead sub-status in Supabase' });
        return false;
      }
      return true;
    } catch (err) {
      set({ leads: previousLeads, error: 'Failed to update lead sub-status in Supabase' });
      return false;
    }
  },

  updateLead: async (leadId, leadData) => {
    // Optimistic update
    const previousLeads = get().leads;
    set((state) => ({
      leads: state.leads.map(lead => lead.id === leadId ? { ...lead, ...leadData } : lead),
      selectedLead: state.selectedLead?.id === leadId ? { ...state.selectedLead, ...leadData } : state.selectedLead
    }));

    try {
      const success = await supabaseService.updateLead(leadId, leadData);
      if (!success) {
        // Revert on failure
        set({ leads: previousLeads, error: 'Failed to update lead in Supabase' });
        return false;
      }
      return true;
    } catch (err) {
      set({ leads: previousLeads, error: 'Failed to update lead in Supabase' });
      return false;
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

  subscribeToLeads: (pipelineId?: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    const channelId = `realtime:leads-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          ...(pipelineId ? { filter: `pipeline_id=eq.${pipelineId}` } : {})
        },
        (payload) => {
          console.log('Realtime Leads Event:', payload.eventType);
          const { eventType, new: newRecord, old: oldRecord } = payload;

          set((state) => {
            let updatedLeads = [...state.leads];
            let updatedSelectedLead = state.selectedLead;

            if (eventType === 'INSERT') {
              // Add only if not already there (prevent double adding)
              if (!updatedLeads.some(l => l.id === (newRecord as Lead).id)) {
                updatedLeads = [newRecord as Lead, ...updatedLeads];
              }
            } else if (eventType === 'UPDATE') {
              updatedLeads = updatedLeads.map(l =>
                l.id === (newRecord as Lead).id ? { ...l, ...newRecord } : l
              );
              // Keep the open modal in sync
              if (state.selectedLead?.id === (newRecord as Lead).id) {
                updatedSelectedLead = { ...state.selectedLead, ...(newRecord as Lead) };
              }
            } else if (eventType === 'DELETE') {
              updatedLeads = updatedLeads.filter(l => l.id !== (oldRecord as any).id);
              // Close the modal if the deleted lead was open
              if (state.selectedLead?.id === (oldRecord as any).id) {
                updatedSelectedLead = null;
              }
            }

            return { leads: updatedLeads, selectedLead: updatedSelectedLead };
          });
        }
      )
      .subscribe((status) => {
        console.log(`Realtime Leads Status (${channelId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
