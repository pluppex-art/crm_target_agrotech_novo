import { create } from 'zustand';
import { Lead, LeadStatus, LeadSubStatus } from '../types/leads';
import { supabaseService } from '../services/supabaseService';
import { getSupabaseClient } from '../lib/supabase';
import { emailService } from '../services/emailService';
import { emailTemplates } from '../services/emailTemplates';
import { notifyNewLead, notifyLeadAssignment, notifyLeadManualTransfer } from '../services/leadNotificationService';
import { useProfileStore } from './useProfileStore';
import { useTurmaStore } from './useTurmaStore';
import { useAuthStore } from './useAuthStore';
import { auditService } from '../services/auditService';
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
    // Clear leads immediately when switching pipelines to prevent "ghost" leads from previous pipeline
    set({ leads: [], isLoading: true, error: null });
    try {
      const leads = await supabaseService.getLeads(pipelineId, startDate, endDate);
      set({ leads, isLoading: false });
    } catch (err) {
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
        if (newLead) {
          const { profiles } = useProfileStore.getState();
          notifyNewLead(newLead, profiles);
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
      const targetStage = usePipelineStore.getState().pipelines
        .flatMap(p => p.stages)
        .find(s => s.id === stageId);
      
      const stageName = targetStage?.name || 'Etapa desconhecida';
      const targetPipelineId = usePipelineStore.getState().pipelines.find(p => p.stages.some(s => s.id === stageId))?.id;

      const stageNameLower = stageName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const isGanhoStage = stageNameLower.includes('ganho') || stageNameLower.includes('concluido');

      // Optimistic update for pipeline_id as well
      if (targetPipelineId) {
        set((state) => ({
          leads: state.leads.map(lead => lead.id === leadId ? { ...lead, stage_id: stageId, pipeline_id: targetPipelineId } : lead),
          selectedLead: state.selectedLead?.id === leadId ? { ...state.selectedLead, stage_id: stageId, pipeline_id: targetPipelineId } : state.selectedLead
        }));
      }

      // Update both stage and pipeline in Supabase
      const { data: updateData, error: updateError } = await getSupabaseClient()!
        .from('leads')
        .update({ 
          stage_id: stageId,
          ...(targetPipelineId ? { pipeline_id: targetPipelineId } : {}),
          ...(isGanhoStage ? { won_at: new Date().toISOString() } : {})
        })
        .eq('id', leadId);

      if (updateError) {
        set({ leads: previousLeads, error: 'Failed to update lead stage' });
        return false;
      }

      if (isGanhoStage) {
        // Se a etapa é de Ganho/Conclusão, atualiza o status para 'closed' e grava a data do ganho
        const won_at = new Date().toISOString();
        await supabaseService.updateLead(leadId, { status: 'closed', won_at } as any);
        set((state) => ({
          leads: state.leads.map(l => l.id === leadId ? { ...l, status: 'closed' as LeadStatus, won_at } as Lead : l),
          selectedLead: state.selectedLead?.id === leadId ? { ...state.selectedLead, status: 'closed' as LeadStatus, won_at } as Lead : state.selectedLead
        }));
      } else {
        // Se saiu de uma etapa de ganho, limpamos o won_at
        const currentLead = previousLeads.find(l => l.id === leadId);
        if (currentLead?.status && String(currentLead.status) === 'closed') {
          await supabaseService.updateLead(leadId, { status: 'proposal', won_at: null } as any);
          set((state) => ({
            leads: state.leads.map(l => l.id === leadId ? { ...l, status: 'proposal' as LeadStatus, won_at: null } as Lead : l),
            selectedLead: state.selectedLead?.id === leadId ? { ...state.selectedLead, status: 'proposal' as LeadStatus, won_at: null } as Lead : state.selectedLead
          }));
        }
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
    const finalLeadData = { ...leadData };
    
    // Se o status está sendo alterado para ganho ou saindo de ganho
    const newStatus = (finalLeadData as any).status;
    if (String(newStatus) === 'closed') {
      (finalLeadData as any).won_at = new Date().toISOString();
    } else if (newStatus && String(newStatus) !== 'closed') {
      (finalLeadData as any).won_at = null;
    }

    set((state) => ({
      leads: state.leads.map(lead => lead.id === leadId ? { ...lead, ...finalLeadData } as Lead : lead),
      selectedLead: state.selectedLead?.id === leadId ? { ...state.selectedLead, ...finalLeadData } as Lead : state.selectedLead
    }));

    try {
      const success = await supabaseService.updateLead(leadId, finalLeadData);
      if (!success) {
        // Revert on failure
        set({ leads: previousLeads, error: 'Failed to update lead in Supabase' });
        return false;
      }

      // Automated Emails
      const updatedLead = { ...previousLeads.find(l => l.id === leadId), ...leadData };

      // 1. Assignment/Transfer Email: Trigger if responsible changed
      const prevLead = previousLeads.find(l => l.id === leadId);
      const newResponsibleId = leadData.responsavel_usuario_id;
      const prevResponsibleId = prevLead?.responsavel_usuario_id;
      const responsibleChanged = newResponsibleId !== prevResponsibleId;
      if (responsibleChanged) {
        const { profiles } = useProfileStore.getState();
        const toIdentifier = newResponsibleId || '';
        const fromIdentifier = prevResponsibleId || null;
        if (fromIdentifier && toIdentifier) {
          notifyLeadManualTransfer(updatedLead as Lead, fromIdentifier, toIdentifier, profiles);
        } else if (toIdentifier) {
          notifyLeadAssignment(updatedLead as Lead, toIdentifier, profiles);
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
      const deletedLead = previousLeads.find(l => l.id === leadId);
      const success = await supabaseService.deleteLead(leadId);
      if (!success) {
        set({ leads: previousLeads, error: 'Failed to delete lead in Supabase' });
        alert('Erro ao excluir lead. Verifique se o servidor está rodando e tente novamente.');
      } else if (deletedLead) {
        const user = useAuthStore.getState().user;
        if (user) {
          const profile = useProfileStore.getState().profiles.find(p => p.id === user.id);
          auditService.logAction({
            userId: user.id,
            userName: profile?.name || user.email || 'Usuário Desconhecido',
            action: 'Excluir Lead',
            entityType: 'lead',
            entityId: leadId,
            details: { leadName: deletedLead.name, phone: deletedLead.phone }
          });
        }
      }
    } catch (err) {
      set({ leads: previousLeads, error: 'Failed to delete lead in Supabase' });
      alert('Erro ao excluir lead. Verifique se o servidor está rodando e tente novamente.');
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

            // Fields that come from lead_class_enrollments via JOIN and should NOT be
            // overwritten with values from the raw 'leads' realtime event (which won't have
            // enrollment data merged in). We keep valor_recebido, taxa_matricula_recebido,
            // forma_pagamento, discount fields here since they live only in enrollments.
            // BUT pix_completed, contract_signed and URLs now ALSO live in the leads table
            // (Phase 1 fix), so we allow those to come through from realtime updates.
            const ENROLLMENT_FIELDS = new Set([
              'rg_photo_url', 'profile_photo_url', 'valor_recebido',
              'taxa_matricula_recebido', 'forma_pagamento', 'discount', 'discount_applied',
              'discount_type',
            ]);

            if (eventType === 'INSERT') {
              // Add only if not already there (prevent double adding)
              if (!updatedLeads.some(l => l.id === (newRecord as Lead).id)) {
                updatedLeads = [newRecord as Lead, ...updatedLeads];
              }
            } else if (eventType === 'UPDATE') {
              const leadsUpdate = Object.fromEntries(
                Object.entries(newRecord as any).filter(([k]) => !ENROLLMENT_FIELDS.has(k))
              );
              updatedLeads = updatedLeads.map(l =>
                l.id === (newRecord as Lead).id ? { ...l, ...leadsUpdate } : l
              );
              // Keep the open modal in sync
              if (state.selectedLead?.id === (newRecord as Lead).id) {
                updatedSelectedLead = { ...state.selectedLead, ...leadsUpdate };
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

    // 2. Subscribe to lead_class_enrollments
    const enrollChannelId = `realtime:enrollments-${Math.random().toString(36).substring(7)}`;
    const enrollChannel = supabase
      .channel(enrollChannelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_class_enrollments' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          if (eventType === 'DELETE') return;

          const enrollment = newRecord as any;
          const leadId = enrollment.lead_id;
          if (!leadId) return;

          set((state) => {
            const updatedLeads = state.leads.map(l => {
              if (l.id !== leadId) return l;
              return {
                ...l,
                pix_completed: enrollment.pix_completed ?? l.pix_completed,
                contract_signed: enrollment.contract_signed ?? l.contract_signed,
                payment_proof_url: enrollment.payment_proof_url ?? l.payment_proof_url,
                contract_url: enrollment.contract_url ?? l.contract_url,
                professor_proof_url: enrollment.professor_proof_url ?? l.professor_proof_url,
                valor_recebido: enrollment.valor_recebido ?? l.valor_recebido,
                taxa_matricula_recebido: enrollment.taxa_matricula_recebido ?? l.taxa_matricula_recebido,
                forma_pagamento: enrollment.forma_pagamento ?? l.forma_pagamento,
                discount: enrollment.discount ?? l.discount,
                discount_applied: enrollment.discount_applied ?? l.discount_applied,
                discount_type: enrollment.discount_type ?? l.discount_type,
                rg_photo_url: enrollment.rg_photo_url ?? l.rg_photo_url,
                profile_photo_url: enrollment.profile_photo_url ?? l.profile_photo_url,
                cost_center: enrollment.cost_center ?? l.cost_center,
              };
            });

            const updatedSelectedLead = state.selectedLead?.id === leadId
              ? updatedLeads.find(l => l.id === leadId) || null
              : state.selectedLead;

            return { leads: updatedLeads, selectedLead: updatedSelectedLead };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(enrollChannel);
    };
  },
}));
