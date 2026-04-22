import { useState, useEffect } from 'react';
import { turmaService, Turma, TurmaAttendee } from '../services/turmaService';
import { useLeadStore } from '../store/useLeadStore';
import { useProductStore } from '../store/useProductStore';
import { financialCalculator } from '../services/financialCalculator';

interface UseLeadTurmasProps {
  leadId: string;
}

export const useLeadTurmas = ({ leadId }: UseLeadTurmasProps) => {
  const [leadTurmas, setLeadTurmas] = useState<{ turma: Turma; attendee: TurmaAttendee }[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  useEffect(() => {
    if (leadId) {
      loadTurmas();
    }
  }, [leadId]);

  const loadTurmas = async () => {
    setLoadingTurmas(true);
    try {
      const result = await turmaService.getAttendeeHistory(leadId);
      setLeadTurmas(result);
    } catch (error) {
      console.error('Error loading turmas for lead:', error);
      setLeadTurmas([]);
    } finally {
      setLoadingTurmas(false);
    }
  };

  const updateAttendeePayment = async (attendeeId: string, valor_recebido: number | null, forma_pagamento: string) => {
    // 1. Update the specific attendee payment
    await turmaService.updateAttendeePayment(attendeeId, valor_recebido, forma_pagamento);
    
    // 2. Reload absolute source of truth for this lead's enrollment history
    const result = await turmaService.getAttendeeHistory(leadId);
    setLeadTurmas(result);

    // 3. Sync with the main Lead record so the Pipeline/Finance pick it up
    if (leadId) {
      const { updateLead } = useLeadStore.getState();
      const { products } = useProductStore.getState();
      
      // Calculate total paid across all enrollments
      const totalFromTurmas = result.reduce((sum, item) => sum + (item.attendee.valor_recebido || 0), 0);
      
      await updateLead(leadId, { 
        valor_recebido: totalFromTurmas,
        forma_pagamento: forma_pagamento || undefined
      });
    }
  };

  return {
    leadTurmas,
    loadingTurmas,
    loadTurmas,
    updateAttendeePayment,
  };
};

