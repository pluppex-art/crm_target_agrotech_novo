import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LeadStatus } from '../types/leads';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mapeia o nome de uma etapa do pipeline para o status legado do lead.
 * Usado para manter o campo `status` em sincronia com o `stage_id`.
 */
export function stageNameToStatus(stageName: string): LeadStatus {
  const n = stageName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (
    n.includes('ganho') ||
    n.includes('aprovado') ||
    n.includes('fechado') ||
    n.includes('conclu')
  ) return 'closed';
  if (
    n.includes('proposta') ||
    n.includes('negociacao') ||
    n.includes('contrato') ||
    n.includes('orcamento') ||
    n.includes('execucao') ||
    n.includes('manutencao')
  ) return 'proposal';
  if (
    n.includes('qualificado') ||
    n.includes('diagnostico') ||
    n.includes('pronto venda') ||
    n.includes('pre-auditoria') ||
    n.includes('auditoria')
  ) return 'qualified';
  return 'new';
}

export function parseBRNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let clean = val.toString().trim();
  if (!clean) return 0;

  // Remove currency symbols and non-numeric chars except . , and -
  clean = clean.replace(/[R$\s]/g, '');

  // Case: 1.234,56 -> 1234.56
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  
  // Case: 1234,56 -> 1234.56
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  
  // Case: 1.234 -> 1234 (Dot as thousands separator)
  // Regra common: if exactly 3 digits after dot, it's likely thousands.
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts[parts.length - 1].length === 3) {
      return parseFloat(clean.replace(/\./g, '')) || 0;
    }
  }
  
  // Standard parseFloat for anything else (handles 1234.56)
  const result = parseFloat(clean);
  return isNaN(result) ? 0 : result;
}

export function getLeadEffectiveValue(lead: {
  value: string | number;
  discount?: string | number;
  discount_type?: 'percent' | 'money';
  discount_applied?: boolean;
}): number {
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
}

/** Formats a string of digits as CPF (≤11 digits) or CNPJ (>11 digits). */
export function formatCPFCNPJ(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    // CPF
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  } else {
    // CNPJ
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$3')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
}

/** Formats digits as (00) 00000-0000 or (00) 0000-0000 */
export function formatPhone(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    // (00) 0000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
  // (00) 00000-0000
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}



export function getFaixaIcon(faixa: 'verde' | 'amarela' | 'vermelha' | null): string {
  switch (faixa) {
    case 'verde': return '🟢';
    case 'amarela': return '🟡';
    case 'vermelha': return '🔴';
    default: return '⚪';
  }
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffInSeconds < 5) return 'agora mesmo';
  if (diffInSeconds < 60) return `há ${diffInSeconds} segundos`;
  
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  
  return d.toLocaleDateString('pt-BR');
}
