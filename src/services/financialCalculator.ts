import type { Product } from './productService';

export interface LeadFinancialData {
  value: string | number;
  product: string;
  discount?: string | number;
  discount_type?: 'percent' | 'money';
  discount_applied?: boolean;
  valor_recebido?: number | null;
  taxa_matricula_recebido?: number | null;
  pix_completed?: boolean;
  professor_proof_url?: string | null;
}

export const formatCurrency = (value: number | string | undefined | null): string => {
  const amount = typeof value === 'string' ? parseBRNumber(value) : (value ?? 0);
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function parseBRNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let clean = val.toString().trim();
  if (!clean) return 0;

  clean = clean.replace(/[R$\s]/g, '');

  // "1.234,56"
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // "1234,56"
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  // "1.234" (thousands separator — last segment has exactly 3 digits)
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts[parts.length - 1].length === 3) {
      return parseFloat(clean.replace(/\./g, '')) || 0;
    }
  }

  const result = parseFloat(clean);
  return isNaN(result) ? 0 : result;
}

export const isServiceProduct = (product?: Product | null): boolean => {
  if (!product?.category) return false;
  // Normalize to remove accents: "Serviço" -> "servico"
  const category = product.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return category.startsWith('servico');
};

export const financialCalculator = {
  formatCurrency,
  parseBRNumber,
  isServiceProduct,

  findProduct: (productName: string, products: Product[]): Product | undefined => {
    if (!productName) return undefined;
    const searchName = productName.toLowerCase().trim();
    return products.find(p => {
      const pName = p.name.toLowerCase().trim();
      return searchName === pName || searchName.includes(pName);
    });
  },

  /** Base value minus any discount. */
  getEffectiveValue: (lead: LeadFinancialData): number => {
    const baseValue = parseBRNumber(lead.value);
    if (!lead.discount_applied) return baseValue;

    const discountAmount = parseBRNumber(lead.discount);
    if (discountAmount <= 0) return baseValue;

    const total =
      lead.discount_type === 'money'
        ? baseValue - discountAmount
        : baseValue * (1 - discountAmount / 100);

    return Math.max(0, Math.round(total * 100) / 100);
  },

  /** Enrollment fee from the product record (0 for service products). */
  getEnrollmentFee: (leadProduct: string, products: Product[]): number => {
    const product = financialCalculator.findProduct(leadProduct, products);
    return product?.enrollment_fee ?? 0;
  },

  /** Effective course value + enrollment fee. */
  getTotalContracted: (lead: LeadFinancialData, products: Product[]): number => {
    const courseValue = financialCalculator.getEffectiveValue(lead);
    const fee = financialCalculator.getEnrollmentFee(lead.product, products);
    return courseValue + fee;
  },

  /**
   * Total confirmed payments received.
   *
   * Course products: valor_recebido + taxa_matricula_recebido
   *   (or enrollment fee when pix_completed and taxa not yet filled)
   * Service products: valor_recebido when available; if professor_proof_url exists
   *   but no amount was entered yet, the full contracted value is used as a fallback
   *   because proof of payment confirms the service was fully paid.
   */
  getPaidAmount: (lead: LeadFinancialData, products: Product[]): number => {
    let paid = 0;
    
    // Ensure valor_recebido is treated as a number
    const professorRec = typeof lead.valor_recebido === 'string'
      ? parseBRNumber(lead.valor_recebido)
      : (lead.valor_recebido ?? 0);
    
    paid += professorRec;

    const productObj = financialCalculator.findProduct(lead.product, products);
    if (!financialCalculator.isServiceProduct(productObj)) {
      if (lead.taxa_matricula_recebido != null) {
        paid += lead.taxa_matricula_recebido;
      } else if (lead.pix_completed) {
        paid += financialCalculator.getEnrollmentFee(lead.product, products);
      }
    }

    return Math.round(paid * 100) / 100;
  },

  /**
   * Returns the professor's received amount for service products.
   * valor_recebido is synced from turma_attendees by useLeadTurmas.
   */
  getProfessorPaidAmount: (lead: LeadFinancialData, products: Product[]): number => {
    const productObj = financialCalculator.findProduct(lead.product, products);
    if (!financialCalculator.isServiceProduct(productObj)) return 0;
    return Math.round((lead.valor_recebido ?? 0) * 100) / 100;
  },

  /** Whether the professor has uploaded proof of payment (service products only). */
  isProfessorConfirmed: (lead: LeadFinancialData): boolean => {
    return !!lead.professor_proof_url;
  },

  /** Total contracted minus total paid. Never negative. */
  getPendingAmount: (lead: LeadFinancialData, products: Product[]): number => {
    const total = financialCalculator.getTotalContracted(lead, products);
    const paid = financialCalculator.getPaidAmount(lead, products);
    return Math.max(0, Math.round((total - paid) * 100) / 100);
  },

  /**
   * Whether the lead is fully paid, partially paid, or still pending.
   *
   * Service products: also requires professor_proof_url to be considered 'paid'.
   */
  getPaymentStatus: (lead: LeadFinancialData, products: Product[]): 'paid' | 'partial' | 'pending' => {
    const productObj = financialCalculator.findProduct(lead.product, products);
    const isService = financialCalculator.isServiceProduct(productObj);
    const paid = financialCalculator.getPaidAmount(lead, products);
    const total = financialCalculator.getTotalContracted(lead, products);

    if (isService) {
      if (paid <= 0 && !lead.professor_proof_url) return 'pending';
      if (paid >= total && !!lead.professor_proof_url) return 'paid';
      return 'partial';
    }

    if (paid <= 0) return 'pending';
    return paid >= total ? 'paid' : 'partial';
  },

  /** Payment progress as a 0–100 percentage. */
  getPaymentProgress: (lead: LeadFinancialData, products: Product[]): number => {
    const total = financialCalculator.getTotalContracted(lead, products);
    if (total <= 0) return 100;
    const paid = financialCalculator.getPaidAmount(lead, products);
    return Math.min(100, Math.round((paid / total) * 100));
  },
};
