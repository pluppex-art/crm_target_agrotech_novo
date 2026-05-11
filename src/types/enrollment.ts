export type EnrollmentStatus =
  | 'ENROLLED'
  | 'CONFIRMED'
  | 'TRANSFERRED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type RefundStatus = 'NONE' | 'PARTIAL' | 'FULL';

export interface LeadClassEnrollment {
  id: string;
  lead_id: string;
  class_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  confirmed_at: string | null;
  removed_at: string | null;
  completed_at: string | null;
  transfer_to_class_id: string | null;
  transferred_at: string | null;
  cancellation_reason: string | null;
  refund_status: RefundStatus;
  contracted_amount: number | null;
  income_transaction_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Enrollment com dados da turma incluídos (via join)
export interface EnrollmentWithDetails extends LeadClassEnrollment {
  turmas: {
    id: string;
    name: string;
    date: string | null;
    status: string;
    price: number | null;
    category: string | null;
  } | null;
}

// ─── Parâmetros dos métodos do enrollmentService ──────────────────────────────

export interface EnrollParams {
  lead_id: string;
  class_id: string;
  responsavel_usuario_id: string;
  contracted_amount?: number;
  income_transaction_id?: string;
  notes?: string;
  created_by?: string;
}

export interface TransferParams {
  to_class_id: string;
  reason?: string;
  // true = atualiza class_id na financial_transaction original para a nova turma
  update_transaction_class?: boolean;
}

export interface CancelParams {
  reason: string;
  refund_type: RefundStatus;
  // Obrigatório se refund_type = PARTIAL; ignorado se FULL (usa valor original) ou NONE
  refund_amount?: number;
}

// ─── Resultado do cancel() ────────────────────────────────────────────────────

export interface CancelResult {
  enrollment: LeadClassEnrollment;
  // ID da transação de reembolso criada, quando aplicável
  refund_transaction_id: string | null;
  // Sinaliza que a comissão do vendedor naquele período já foi paga
  // e precisa de revisão manual pelo gestor
  ote_divergence: boolean;
  ote_divergence_period: string | null;
}

// ─── Resultado do transfer() ─────────────────────────────────────────────────

export interface TransferResult {
  previous_enrollment: LeadClassEnrollment;
  new_enrollment: LeadClassEnrollment;
}
