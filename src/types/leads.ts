export type LeadStatus = 'new' | 'qualified' | 'proposal' | 'closed';

export type LeadSubStatus = string | null;

export interface Lead {
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
}

