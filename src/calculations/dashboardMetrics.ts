/**
 * calculations/dashboardMetrics.ts
 *
 * Cálculo de PAGO e PENDENTE do Dashboard (turmas por período).
 * Fonte: attendees das turmas filtradas por data.
 */

interface Attendee {
  status: string;
  valor_recebido?: number | null;
}

interface Turma {
  date?: string;
  status: string;
  price?: number;
  enrollment_fee?: number;
  attendees: Attendee[];
}

export interface DashboardPaymentResult {
  totalPago: number;
  totalPendente: number;
}

/**
 * Calcula PAGO e PENDENTE para o Dashboard.
 *
 * Regras:
 *  1. Filtra turmas pelo intervalo de datas (startDate / endDate)
 *  2. PAGO    = soma de attendee.valor_recebido de turmas CONCLUÍDAS
 *  3. PENDENTE = (preço + taxa de matrícula) − pago para turmas NÃO concluídas
 *  4. Attendees cancelados são ignorados
 */
export function calcDashboardPayments(
  turmas: Turma[],
  startDate?: string,
  endDate?: string,
): DashboardPaymentResult {
  let pago = 0;
  let pendente = 0;

  const start = startDate ? new Date(startDate + 'T00:00:00') : null;
  const end   = endDate   ? new Date(endDate   + 'T23:59:59') : null;

  turmas.forEach((t) => {
    if (!t.date) return;

    const tDate = new Date(t.date + 'T12:00:00');
    if (start && tDate < start) return;
    if (end   && tDate > end)   return;

    const turmaTotalValue = (t.price || 0) + (t.enrollment_fee || 0);

    t.attendees.forEach((a) => {
      if (a.status === 'cancelado') return;

      const paid = Number(a.valor_recebido ?? 0);

      // PAGO: apenas turmas concluídas
      if (t.status === 'concluida') {
        pago += paid;
      }

      // PENDENTE: apenas turmas ainda em andamento
      if (t.status !== 'concluida') {
        const remainder = turmaTotalValue - paid;
        if (remainder > 0) pendente += remainder;
      }
    });
  });

  return { totalPago: pago, totalPendente: pendente };
}
