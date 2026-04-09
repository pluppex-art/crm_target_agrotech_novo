export type LeadStatus = 'new' | 'qualified' | 'proposal' | 'closed';
export type LeadSubStatus = 'qualified' | 'warming' | 'disqualified';

export interface LeadHistory {
  id: string;
  date: string;
  time: string;
  description: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  product: string;
  value: number;
  stars: number;
  photo: string;
  status: LeadStatus;
  subStatus: LeadSubStatus | null;
  pipeline_id?: string;
  stage_id?: string;
  stage?: {
    name: string;
    color: string;
    position: number;
  };
  pipeline?: {
    name: string;
  };
  cnpj?: string;
  city?: string;
  discount?: string;
  responsible?: string;
  created_at: string;
  last_contact_at?: string;
  history?: LeadHistory[];
}

