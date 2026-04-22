import type { Product } from './productService';

/**
 * financialCalculator
 * Centralizes all financial logic, currency formatting, and business rules 
 * for course versus service products.
 */

export interface LeadFinancialData {
  value: string | number;
  product: string;
  discount?: string | number;
  discount_type?: 'percent' | 'money';
  discount_applied?: boolean;
  valor_recebido?: number | null;
  taxa_matricula_recebido?: number | null;
  pix_completed?: boolean;
}

/**
 * Formats a number as Brazilian Real (R$)
 */
export const formatCurrency = (value: number | string | undefined | null): string => {
  const amount = typeof value === 'string' ? parseBRNumber(value) : (value ?? 0);
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

/**
 * Parses numeric strings in Brazilian format (e.g. "1.234,56" -> 1234.56)
 */
export function parseBRNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let clean = val.toString().trim();
  if (!clean) return 0;

  // Remove currency symbols, spaces and common non-numeric chars
  clean = clean.replace(/[R$\s]/g, '');

  // Handle case: 1.234,56
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  
  // Handle case: 1234,56
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  
  // Handle case: 1.234 (likely thousands)
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts[parts.length - 1].length === 3) {
      return parseFloat(clean.replace(/\./g, '')) || 0;
    }
  }
  
  const result = parseFloat(clean);
  return isNaN(result) ? 0 : result;
}

/**
 * Logic to check if a product category belongs to "Services/Professor"
 */
export const isServiceProduct = (product?: Product | null): boolean => {
  if (!product?.category) return false;
  const category = product.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return category.startsWith('servico') || category.startsWith('serviço');
};

export const financialCalculator = {
  formatCurrency,
  parseBRNumber,
  isServiceProduct,

  /**
   * Helper to find a product object by name within a list
   */
  findProduct: (productName: string, products: Product[]): Product | undefined => {
    if (!productName) return undefined;
    const searchName = productName.toLowerCase().trim();
    return products.find(p => {
      const pName = p.name.toLowerCase().trim();
      return searchName === pName || searchName.includes(pName);
    });
  },

  /**
   * Calculate effective course value (Base Value - Discount)
   */
  getEffectiveValue: (lead: LeadFinancialData): number => {
    const baseValue = parseBRNumber(lead.value);
    if (!lead.discount_applied) return baseValue;
    
    const discountAmount = parseBRNumber(lead.discount);
    if (discountAmount <= 0) return baseValue;

    let total = baseValue;
    if (lead.discount_type === 'money') {
      total = baseValue - discountAmount;
    } else {
      // default: percent
      total = baseValue * (1 - discountAmount / 100);
    }
    
    return Math.max(0, Math.round(total * 100) / 100);
  },

  /**
   * Get enrollment fee (taxa) from product data
   */
  getEnrollmentFee: (leadProduct: string, products: Product[]): number => {
    const product = financialCalculator.findProduct(leadProduct, products);
    return product?.enrollment_fee ?? 0;
  },

  /**
   * Total contracted amount (Effective Course Value + Enrollment Fee)
   */
  getTotalContracted: (lead: LeadFinancialData, products: Product[]): number => {
    const courseValue = financialCalculator.getEffectiveValue(lead);
    const fee = financialCalculator.getEnrollmentFee(lead.product, products);
    return courseValue + fee;
  },

  /**
   * Total validated payments (received course amount + received fee amount)
   */
  getPaidAmount: (lead: LeadFinancialData, products: Product[]): number => {
    let paid = 0;
    if (lead.valor_recebido != null) paid += lead.valor_recebido;
    
    if (lead.taxa_matricula_recebido != null) {
      paid += lead.taxa_matricula_recebido;
    } else if (lead.pix_completed) {
      // PIX marks fee as paid even if specific value not filled
      paid += financialCalculator.getEnrollmentFee(lead.product, products);
    }
    return Math.round(paid * 100) / 100;
  },

  /**
   * Pending balance (Total Contracted - Total Paid)
   */
  getPendingAmount: (lead: LeadFinancialData, products: Product[]): number => {
    const total = financialCalculator.getTotalContracted(lead, products);
    const paid = financialCalculator.getPaidAmount(lead, products);
    return Math.max(0, Math.round((total - paid) * 100) / 100);
  }
};
