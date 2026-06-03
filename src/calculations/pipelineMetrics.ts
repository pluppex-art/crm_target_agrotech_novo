/**
 * calculations/pipelineMetrics.ts
 *
 * Cálculo dos cards PAGO e PENDENTE do Pipeline.
 * Fonte: leads em estágio Ganho + turmas concluídas do mês atual.
 */
import { financialCalculator, type LeadFinancialData } from '../services/financialCalculator';
import type { Product } from '../services/productService';

interface Lead {
  id: string;
  stage_id?: string | null;
  value?: string | number;           // exigido por LeadFinancialData
  product?: string | null;           // exigido por LeadFinancialData
  discount?: string | number;
  discount_type?: 'percent' | 'money';
  discount_applied?: boolean;
  taxa_matricula_recebido?: number | null;
  valor_recebido?: number | null;
  [key: string]: any;
}

interface AttendeeInfo {
  status: string;
  valor_recebido?: number | null;
  taxa_matricula_recebido?: number | null;
}

interface TurmaInfo {
  status: string;
  date?: string;
  price?: number;
  enrollment_fee?: number;
  attendee: AttendeeInfo;
}

export interface PipelinePaymentResult {
  pago: number;
  pendente: number;
}

/**
 * Calcula PAGO e PENDENTE para o header do Pipeline.
 *
 * Regras:
 *  1. Só conta leads no estágio "Ganho" (ganhoStageIds)
 *  2. Se o lead está numa turma CONCLUÍDA → só conta se for do MÊS ATUAL
 *  3. Se o lead está num estágio "Turma Concluido" (concluStageIds) e não tem turma mapeada → ignora
 *  4. PAGO    = valor_recebido do attendee + taxa_matricula_recebido
 *  5. PENDENTE = total contratado − pago (nunca negativo)
 */
export function calcPipelinePayments(
  leads: Lead[],
  ganhoStageIds: Set<string>,
  leadToTurma: Record<string, TurmaInfo>,
  products: Product[],
  referenceDate: Date = new Date(),
  concluStageIds: Set<string> = new Set(),
): PipelinePaymentResult {
  let pago = 0;
  let pendente = 0;

  const processedLeads = new Set<string>();

  leads.forEach((lead) => {
    if (!lead.id) return;
    if (processedLeads.has(lead.id)) return;
    processedLeads.add(lead.id);

    // 1. Apenas leads em Ganho
    const isGanho = ganhoStageIds.has(lead.stage_id ?? '');
    if (!isGanho) return;

    const tInfo = leadToTurma[lead.id];

    // 2. Se o lead está num estágio "Turma Concluido" mas não tem turma mapeada no store,
    //    não é possível verificar o mês — ignora para evitar somar pagamentos de meses anteriores.
    if (!tInfo && concluStageIds.has(lead.stage_id ?? '')) return;

    // 3. Se a turma já foi concluída, só considera se for do mês atual para efeitos de PAGO.
    // Para PENDENTE, turmas concluídas nunca entram.
    if (tInfo?.status === 'concluida') {
      if (!tInfo.date) return;
      const d = new Date(tInfo.date + 'T12:00:00');
      if (d.getMonth() !== referenceDate.getMonth() || d.getFullYear() !== referenceDate.getFullYear()) {
        return;
      }
    }

    let totalContracted = financialCalculator.getTotalContracted(lead as any, products);
    
    // Se o lead estiver em uma turma, usamos o preço oficial da turma (regra do antigo Dashboard)
    if (tInfo) {
      totalContracted = (tInfo.price || 0) + (tInfo.enrollment_fee || 0);
    }

    const valorDaTurma = tInfo ? Number(tInfo.attendee.valor_recebido ?? 0) : 0;
    const taxaMatricula = tInfo
      ? Number(tInfo.attendee.taxa_matricula_recebido ?? 0)
      : Number(lead.taxa_matricula_recebido ?? 0);
      
    const leadValorRecebido = Number(lead.valor_recebido ?? 0);
    const received = (valorDaTurma || leadValorRecebido) + taxaMatricula;

    pago += received;

    // 3. PENDENTE: Apenas se o lead estiver em uma turma, NÃO estiver concluída, e NÃO estiver cancelado
    if (tInfo && tInfo.status !== 'concluida' && tInfo.attendee.status !== 'cancelado') {
      pendente += Math.max(0, totalContracted - received);
    }
  });

  return { pago, pendente };
}
