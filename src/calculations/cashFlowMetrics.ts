/**
 * calculations/cashFlowMetrics.ts
 *
 * Cálculo dos KPIs do Financeiro (CashFlow):
 *  - receita_total  → soma do recebido (getPaidAmount) dos leads Ganhos
 *  - contas_receber → soma do pendente (getPendingAmount) dos leads Ganhos
 *  - despesa_total  → saídas pagas (EXPENSE + PAID)
 *  - contas_pagar   → saídas pendentes/vencidas (EXPENSE + PENDING|OVERDUE)
 *  - lucro_liquido  → receita_total − despesa_total
 */
import { financialCalculator } from '../services/financialCalculator';
import type { Product } from '../services/productService';

interface GanhoLead {
  id: string;
  value?: string | number;
  product?: string | null;
  discount?: string | number;
  discount_type?: 'percent' | 'money';
  discount_applied?: boolean;
  valor_recebido?: number | null;
  taxa_matricula_recebido?: number | null;
  [key: string]: any;
}

interface Transaction {
  type: string;    // 'INCOME' | 'EXPENSE'
  status: string;  // 'PAID' | 'PENDING' | 'OVERDUE'
  amount: number | string;
}

export interface CashFlowKPIs {
  receita_total: number;
  contas_receber: number;
  despesa_total: number;
  contas_pagar: number;
  lucro_liquido: number;
  margem_liquida: number;
  alunos_ganhos: number;
}

/**
 * Calcula os KPIs de caixa (Financeiro).
 *
 * @param ganhoLeads  Leads com estágio Ganho vindos do período filtrado
 * @param transactions Transações financeiras do período
 * @param products     Lista de produtos (para calcular taxa de matrícula)
 */
export function calcCashFlowKPIs(
  ganhoLeads: GanhoLead[],
  transactions: Transaction[],
  products: Product[],
): CashFlowKPIs {
  // Receita = soma do que foi realmente recebido de cada lead Ganho
  const receita_total   = ganhoLeads.reduce(
    (s, l) => s + financialCalculator.getPaidAmount(l as any, products),
    0,
  );

  // Contas a Receber = soma do que ainda falta receber
  const contas_receber  = ganhoLeads.reduce(
    (s, l) => s + financialCalculator.getPendingAmount(l as any, products),
    0,
  );

  // Despesas: pagas vs pendentes
  let despesa_total = 0;
  let contas_pagar  = 0;
  for (const t of transactions) {
    if (t.type !== 'EXPENSE') continue;
    const amt = Number(t.amount) || 0;
    if (t.status === 'PAID') {
      despesa_total += amt;
    } else if (t.status === 'PENDING' || t.status === 'OVERDUE') {
      contas_pagar += amt;
    }
  }

  const lucro_liquido = receita_total - despesa_total;

  return {
    receita_total,
    contas_receber,
    despesa_total,
    contas_pagar,
    lucro_liquido,
    margem_liquida: receita_total > 0 ? (lucro_liquido / receita_total) * 100 : 0,
    alunos_ganhos: ganhoLeads.length,
  };
}
