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
  subStatus?: LeadSubStatus;
  cnpj?: string;
  cpf?: string;
  city?: string;
  discount?: string;
  responsible?: string;
  created_at: string;
  history?: LeadHistory[];
}
