export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';
export type OriginType = 'MANUAL' | 'PIPELINE' | 'CLASS' | 'COMMISSION' | 'PARTNER' | 'REFUND';
export type PartnerOrigin = 'TARGET' | 'PLUPPEX' | null;

export interface FinancialCategory {
  id: string;
  name: string;
  type: TransactionType;
  dre_group: string;
  is_system: boolean;
  centro_custo_id?: string | null;
  created_at: string;
}

export interface CentroCusto {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
}

export interface FinancialTransaction {
  [x: string]: any;
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  category_id: string;
  lead_id: string | null;
  class_id: string | null;
  user_id: string | null;
  source_transaction_id: string | null;
  due_date: string | null;
  payment_date: string | null;
  origin_type: OriginType;
  partner_origin: PartnerOrigin;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  centro_custo_id: string | null;
  cost_center?: 'cursos' | 'servico_drone' | 'administrativo' | null;
  created_at: string;
  updated_at: string;
  // Joins
  centro_custos?: { nome: string };
}

export interface DreReportLine {
  id: string;
  label: string;
  value: number;
  isTotal: boolean;
}

export interface DreReport {
  period_start: string;
  period_end: string;
  lines: DreReportLine[];
  margins: {
    bruta: number;
    ebitda: number;
    liquida: number;
  };
}

export type RoleType = 'CLOSER' | 'SDR' | 'MANAGER';
export type SemaphoreStatus = 'RED' | 'YELLOW' | 'GREEN';

export interface CommissionRule {
  id: string;
  role_type: RoleType;
  level: string;
  fixed_amount: number;
  variable_amount: number;
  target_revenue: number;
  target_quantity?: number;
  target_sql?: number;
  bonus_per_enrollment?: number;
  accelerator_amount: number;
  active: boolean;
}

export interface CommissionResult {
  id: string;
  user_id: string;
  squad_id: string | null;
  role_type: RoleType;
  level: string | null;
  period_month: string;
  target_revenue: number;
  realized_revenue: number;
  achievement_percent: number;
  fixed_amount: number;
  variable_amount: number;
  accelerator_amount: number;
  bonus_amount?: number;         // SDR Enrollment Bonus
  special_bonus_amount?: number; // Manager Special Bonuses
  realized_sql?: number;         // SDR SQLs
  realized_enrollments?: number; // SDR Enrollments
  total_amount: number;
  semaphore_status: SemaphoreStatus;
  status: 'TO_PAY' | 'PAID' | 'CANCELLED';
  paid_at: string | null;
  created_at: string;
  // UI joined fields
  user_name?: string;
  squad_name?: string;
  squad_color?: string;
}

// Fonte oficial do nível/função de cada usuário no OTE
export interface UserCompensationProfile {
  id: string;
  user_id: string;
  role_type: RoleType;
  level: string;                 // Ex: 'Junior 1', 'Pleno 2', 'Sênior 3'
  active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  // UI Fields (joined)
  user_name?: string;
  squad_name?: string;
  squad_color?: string;
}

export interface FinanceKPIs {
  receita_total: number;
  despesa_total: number;
  lucro_liquido: number;
  margem_liquida: number;
  contas_receber: number;
  contas_receber_matriculas: number; // enrollment balance (contracted - received)
  contas_receber_manual: number;     // PENDING/OVERDUE MANUAL transactions
  contas_pagar: number;
  alunos_ganhos: number;
}

export interface PartnerRule {
  id: string;
  origin_type: PartnerOrigin;
  technology_fee_percent: number;
  fixed_fee: number;
  category_id: string | null;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  created_at: string;
}

export interface FinancialFeeRule {
  id: string;
  name: string;
  amount: number;
  is_percentage: boolean;
  type: 'TAX' | 'GATEWAY' | 'DISCOUNT' | 'ADMIN_FEE' | 'TECHNOLOGY';
  application_context: 'GROSS_REVENUE' | 'NET_REVENUE' | 'SPECIFIC_SALE' | 'CLASS' | 'PARTNER';
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  created_at: string;
}

export interface Squad {
  id: string;
  name: string;
  manager_id: string | null;
  active: boolean;
  color?: string;
  logo_url?: string;
  company?: string;
  created_at: string;
  updated_at?: string;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  active: boolean;
  created_at: string;
}
