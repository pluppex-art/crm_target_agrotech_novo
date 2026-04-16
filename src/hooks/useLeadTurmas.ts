import { useState, useEffect } from 'react';
import { turmaService, Turma, TurmaAttendee } from '../services/turmaService';

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
    await turmaService.updateAttendeePayment(attendeeId, valor_recebido, forma_pagamento);
    await loadTurmas();
  };

  return {
    leadTurmas,
    loadingTurmas,
    loadTurmas,
    updateAttendeePayment,
  };
};

