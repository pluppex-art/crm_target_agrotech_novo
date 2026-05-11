/**
 * calculations/turmaMetrics.ts
 *
 * Cálculo de métricas de Turmas:
 *  - occupancyData   → taxa de ocupação por turma
 *  - attendeeStages  → distribuição dos alunos por status
 *  - totalPaidAttendees → alunos com pagamento registrado
 */

interface Attendee {
  status: string;
  valor_recebido?: number | null;
  lead_id?: string;
}

interface Turma {
  id: string;
  name: string;
  status: string;
  student_goal?: number;
  price?: number;
  enrollment_fee?: number;
  date?: string;
  attendees: Attendee[];
}

export interface OccupancyItem {
  id: string;
  name: string;
  total: number;
  occupied: number;
  pct: number;
}

export interface AttendeeStageItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

const STAGE_COLORS = [
  'hsl(210, 80%, 55%)',
  'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 80%, 55%)',
  'hsl(30, 90%, 55%)',
];

/**
 * Calcula ocupação por turma.
 * Exclui turmas concluídas e alunos cancelados.
 */
export function calcOccupancy(turmas: Turma[]): OccupancyItem[] {
  return turmas
    .filter(t => t.status !== 'concluida')
    .map(t => {
      const occupied = t.attendees.filter(a => a.status !== 'cancelado').length;
      const total    = t.student_goal ?? 0;
      return {
        id: t.id,
        name: t.name,
        total,
        occupied,
        pct: total > 0 ? Math.min(100, Math.round((occupied / total) * 100)) : 0,
      };
    });
}

/**
 * Agrupa alunos por status (matriculado, pendente, cancelado…).
 */
export function calcAttendeeStages(turmas: Turma[]): AttendeeStageItem[] {
  const counts: Record<string, number> = {};
  turmas.forEach(t => {
    t.attendees.forEach(a => {
      if (a.status !== 'cancelado') {
        counts[a.status] = (counts[a.status] || 0) + 1;
      }
    });
  });
  return Object.entries(counts).map(([label, value], i) => ({
    id: label,
    label,
    value,
    color: STAGE_COLORS[i % STAGE_COLORS.length],
  }));
}

/**
 * Conta alunos que já possuem valor_recebido registrado.
 */
export function calcTotalPaidAttendees(turmas: Turma[]): number {
  return turmas.reduce(
    (sum, t) =>
      sum + t.attendees.filter(a => a.status !== 'cancelado' && a.valor_recebido != null).length,
    0,
  );
}
