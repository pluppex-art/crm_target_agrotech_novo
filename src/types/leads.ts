export type LeadStatus = string;
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
  discount_type?: 'percent' | 'money';
  discount_applied?: boolean;
  responsible?: string;
  pix_completed?: boolean;
  contract_signed?: boolean;
  valor_recebido?: number;
  forma_pagamento?: string;
  taxa_matricula_recebido?: number;
  created_at: string;
  last_contact_at?: string;
  history?: LeadHistory[];
  // Semáforo fields (new)
  margem_percent?: number;
  faixa_comissao?: 'verde' | 'amarela' | 'vermelha' | null | undefined;
  motivo_perda?: string;
  // Attachments for Ganho stage (Seller)
  payment_proof_url?: string | null;
  contract_url?: string | null;
  // Attachments for Ganho stage (Professor)
  professor_proof_url?: string | null;
}


