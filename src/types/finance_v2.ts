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
  created_at: string;
}

export interface FinancialTransaction {
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
  created_at: string;
  updated_at: string;
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
  accelerator_amount: number;
  active: boolean;
}

export interface CommissionResult {
  id: string;
  user_id: string;
  squad_id: string | null;
  role_type: RoleType;
  level: string | null;          // snapshot do nível usado no cálculo — fonte: user_compensation_profiles
  period_month: string;
  target_revenue: number;
  realized_revenue: number;
  achievement_percent: number;
  fixed_amount: number;
  variable_amount: number;
  accelerator_amount: number;
  total_amount: number;
  semaphore_status: SemaphoreStatus;
  status: 'TO_PAY' | 'PAID' | 'CANCELLED';
  paid_at: string | null;
  created_at: string;
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
