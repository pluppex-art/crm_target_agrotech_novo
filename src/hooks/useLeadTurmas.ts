import { useState, useEffect } from 'react';
import { turmaService, Turma, TurmaAttendee } from '../services/turmaService';
import { useLeadStore } from '../store/useLeadStore';
import { useProductStore } from '../store/useProductStore';
import { useAuthStore } from '../store/useAuthStore';
import { noteService } from '../services/noteService';
import { financialCalculator } from '../services/financialCalculator';

interface UseLeadTurmasProps {
  leadId: string;
}

export const useLeadTurmas = ({ leadId }: UseLeadTurmasProps) => {
  const [leadTurmas, setLeadTurmas] = useState<{ turma: Turma; attendee: TurmaAttendee }[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const { user } = useAuthStore();

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

  const updateAttendeePayment = async (
    attendeeId: string, 
    valor_novo: number, 
    forma_pagamento: string,
    isLogOnly: boolean = false
  ) => {
    // 1. Get current data for sum
    const result = await turmaService.getAttendeeHistory(leadId);
    const existingPaid = result.reduce((sum, item) => sum + (Number(item.attendee.valor_recebido) || 0), 0);
    
    // 2. New Total
    const newTotal = existingPaid + valor_novo;

    // 3. Update the specific attendee record (we concatenate payment methods for display)
    const currentAttendee = result.find(r => r.attendee.id === attendeeId)?.attendee;
    const combinedFormas = [currentAttendee?.forma_pagamento, forma_pagamento]
      .filter(f => f && f.trim() !== '')
      .join(', ');

    await turmaService.updateAttendeePayment(attendeeId, newTotal, combinedFormas);
    
    // 4. Reload local state
    const refreshed = await turmaService.getAttendeeHistory(leadId);
    setLeadTurmas(refreshed);

    // 5. Sync with the main Lead record
    const { updateLead } = useLeadStore.getState();
    await updateLead(leadId, { 
      valor_recebido: newTotal,
      forma_pagamento: combinedFormas
    });

    // 6. Log to History (Notes)
    if (valor_novo > 0) {
      const authorName = user?.user_metadata?.full_name || user?.email || 'Professor';
      await noteService.createNote({
        lead_id: leadId,
        author_name: authorName,
        content: `💰 PAGAMENTO REGISTRADO: ${financialCalculator.formatCurrency(valor_novo)} via ${forma_pagamento}. (Total acumulado: ${financialCalculator.formatCurrency(newTotal)})`
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

