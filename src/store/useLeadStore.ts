import { create } from 'zustand';
import { Lead, LeadStatus, LeadSubStatus } from '../types/leads';
import { supabaseService } from '../services/supabaseService';
import { getSupabaseClient } from '../lib/supabase';
import { emailService } from '../services/emailService';
import { emailTemplates } from '../services/emailTemplates';
import { useProfileStore } from './useProfileStore';
import { useTurmaStore } from './useTurmaStore';
import { useAuthStore } from './useAuthStore';
import { usePipelineStore } from './usePipelineStore';

interface LeadStore {
  leads: Lead[];
  selectedLead: Lead | null;
  isLoading: boolean;
  error: string | null;
  fetchLeads: (pipelineId?: string, startDate?: string, endDate?: string) => Promise<void>;
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

  fetchLeads: async (pipelineId?: string, startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const leads = await supabaseService.getLeads(pipelineId, startDate, endDate);
      set({ leads, isLoading: false });
    } catch (err) {
      // Preserve existing leads on error — don't blank the board
      set((state) => ({ isLoading: false, error: 'Failed to fetch leads', leads: state.leads }));
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

        // Automated Email: Notify responsible about new lead
        if (newLead.responsible) {
          const seller = useProfileStore.getState().profiles.find(p => p.name === newLead.responsible);
          if (seller && seller.email) {
            emailService.sendEmail({
              to: seller.email,
              subject: `🔔 Novo Lead: ${newLead.name}`,
              html: emailTemplates.newLeadResponsible(
                seller.name!,
                newLead.name,
                newLead.product || 'Não especificado',
                newLead.origin || 'Cadastro Manual'
              )
            });
          }
        }

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
      const stageName = usePipelineStore.getState().pipelines
        .flatMap(p => p.stages)
        .find(s => s.id === stageId)?.name || 'Etapa desconhecida';

      const success = await supabaseService.updateLeadStage(leadId, stageId);
      if (!success) {
        set({ leads: previousLeads, error: 'Failed to update lead stage' });
        return false;
      }

      // Automated Email: Enrollment Confirmation for "Ganho" stages
      const targetLead = previousLeads.find(l => l.id === leadId);
      if (targetLead && targetLead.email) {
        // Find stage name to check if it's "Ganho"
        // (Assuming stage names are checked here or via a provided mapping)
        // For now, we'll rely on the status or a simple check if the stageId matches a known "Ganho" ID
        // Better: Check if the stage belongs to a "Ganho" category if available
        // Simple approach: trigger if the stageId is provided by the modal as a Ganho stage

        // Let's assume we can check if it's a "Ganho" stage by name (using a small heuristic)
        // We'll fetch the stage from state if available or just check common names
        // But since we are in the store, we don't have the stages list easily here without a fetch.
        // Let's check if the lead status is updated to 'won' implicitly or explicitly.
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

      // Automated Emails
      const updatedLead = { ...previousLeads.find(l => l.id === leadId), ...leadData };

      // 1. Assignment Email: Trigger if responsible changed
      if (leadData.responsible && leadData.responsible !== previousLeads.find(l => l.id === leadId)?.responsible) {
        const seller = useProfileStore.getState().profiles.find(p => p.name === leadData.responsible);
        if (seller && seller.email) {
          emailService.sendEmail({
            to: seller.email,
            subject: `🚀 Novo Lead Atribuído: ${updatedLead.name}`,
            html: emailTemplates.leadAssignment(seller.name!, updatedLead.name!, updatedLead.product || 'Produto não especificado')
          });
        }
      }

      // 2. Enrollment Email: Trigger if it's a course and we have turma info
      // This is often triggered when moving to Ganho, but also if data is filled manually.
      // We'll use a more specific trigger for Enrollment in LeadDetailsModal but let's add a basic check here.

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
    if (!supabase) return () => { };

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
