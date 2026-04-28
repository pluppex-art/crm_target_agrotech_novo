export type LeadStatus = 'new' | 'qualified' | 'proposal' | 'closed';

export type LeadSubStatus = string | null;

export interface Lead {
  stars: number;
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: LeadStatus;
  subStatus: LeadSubStatus;
  stage_id: string;
  pipeline_id: string;
  responsible: string | null;
  value: string | number;
  discount?: string | number;
  discount_type?: 'percent' | 'money';
  discount_applied?: boolean;
  product: string | null;
  created_at: string;
  updated_at: string | null;
  lead_source?: string | null;
  valor_recebido?: number | null;
  taxa_matricula_recebido?: number | null;
  photo?: string | null;
  payment_proof_url?: string | null;
  contract_url?: string | null;
  pix_completed?: boolean;
  contract_signed?: boolean;
  professor_proof_url?: string | null;
  last_contact_at?: string | null;
}

