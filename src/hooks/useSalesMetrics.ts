import { useMemo } from 'react';
import { useLeadStore } from '../store/useLeadStore';
import { useTurmaStore } from '../store/useTurmaStore';
import { useProfileStore } from '../store/useProfileStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { useTaskStore } from '../store/useTaskStore';
import { useProductStore } from '../store/useProductStore';
import { financialCalculator } from '../services/financialCalculator';
import { isVendedor, computeFunnelRates, projectedRevenue, getLeadEffectiveValue, stageNameToStatus, getOccupancyData } from '../lib/utils';

// ─── Calculation modules ──────────────────────────────────────────────────────
import { calcSalesByResponsible, calcAllSellersRanking, calcSellerSemaphore } from '../calculations/sellerMetrics';
import { calcAttendeeStages, calcTotalPaidAttendees } from '../calculations/turmaMetrics';
import {
  buildStageMap,
  calcClosedLeads,
  calcConversionRate,
  calcAverageSalesCycle,
  calcInactiveLeads,
  calcActiveLeads,
  calcTotalSalesValue,
} from '../calculations/leadMetrics';
import { calcPipelinePayments } from '../calculations/pipelineMetrics';

export interface SalesMetrics {
  totalGanhos: number;
  myGanhos: number;
  teamGanhos: number;
  totalReceivedValue: number;
  totalPendente: number;
  leadsCount: number;
  closedLeadsCount: number;
  ganhoStageLeadsCount: number;
  conversionRate: number;
  averageSalesCycle: number;
  inactiveLeadsCount: number;
  totalSalesValue: number;
  occupancyData: ReturnType<typeof getOccupancyData>;
  vendedorProfiles: any[];
  allSellersRanking: Array<{
    id: any;
    label: string; value: number; received: number;
    count: number; percentage: number; leads_goal: number; leads?: any[];
  }>;
  otherSellersRanking: Array<{
    id: string; label: string; value: number; received: number; count: number; leads?: any[];
  }>;
  sellerSemaphoreData: Array<{
    label: string; value: number; received: number; count: number; leads?: any[];
    percentage: number; revenue_goal: number; pct: number;
    color: 'red' | 'yellow' | 'green' | 'gold';
    colorClass: string; barColor: string;
  }>;
  pipelineStages: Array<{ id: string; label: string; value: number; color: string }>;
  funnelStagesWithRates: ReturnType<typeof computeFunnelRates>;
  monthlySales: Array<{ label: string; value: number }>;
  trendData: Array<{ label: string; value: number }>;
  totalConversionRate: number;
  attendeeStages: Array<{ id: string; label: string; value: number; color: string }>;
  availableProducts: Array<{ value: string; label: string }>;
  availableResponsibles: Array<{ value: string; label: string }>;
  activeLeadsCount: number;
}

interface UseSalesMetricsProps {
  currentSellerId?: string | null;
  startDate?: string;
  endDate?: string;
  goals?: Array<{ type: string; seller_id?: string; seller_name?: string; leads_goal?: number; revenue_goal?: number }>;
  searchTerm?: string;
  filterStage?: string;
  filterProduct?: string;
  filterResponsible?: string;
}

export function useSalesMetrics({
  currentSellerId,
  startDate,
  endDate,
  goals = [],
  searchTerm = '',
  filterStage = 'all',
  filterProduct = 'all',
  filterResponsible = 'all',
}: UseSalesMetricsProps): SalesMetrics {
  const { leads } = useLeadStore();
  const { turmas } = useTurmaStore();
  const { profiles } = useProfileStore();
  const { pipelines } = usePipelineStore();
  const { tasks } = useTaskStore();
  const { products } = useProductStore();

  const vendedorProfiles = useMemo(() => 
    profiles
      .filter(p => p.status === 'active' && isVendedor(p))
      .map(p => ({
        ...p,
        cargos: p.cargos || undefined // Converte null para undefined para compatibilidade com Profile[]
      })), [profiles]);

  // ─── Available filter options ───────────────────────────────────────────────
  const GENERIC_TURMA_IDS = new Set([
    'ebebde7b-76d8-4109-b68f-716759cbff4d', // Curso de Piloto de Drone Agrícola
    '6d9b472e-658d-4914-8a38-f424ed07d9fe', // Curso de Inseminação Artificial em Bovinos
    'cab8c1ee-0578-45a2-b032-441b7ef3209a', // Interesse Geral
    'd02f2f09-ced0-455a-82cc-4bc3aa31baff', // Outros
    '21d94258-fce1-4da4-ad67-9eb33968737d', // Aplicação com Drone T-70
    '78a3189d-acc5-4fbc-8567-ff72851a1c94', // Drone, Palmas-To, 17/04/26 (genérico)
  ]);

  const availableProducts = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach((l: any) => {
      if (l.product_id && !GENERIC_TURMA_IDS.has(l.product_id)) seen.add(l.product_id);
    });
    return Array.from(seen).map(id => {
      const product = products.find((p: any) => p.id === id);
      return { value: id, label: product?.name || id };
    }).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [leads, products]);

  const availableResponsibles = useMemo(() => {
    const inactiveIds = new Set(profiles.filter(p => p.status === 'inactive').map(p => p.id));
    const seen = new Set<string>();
    leads.forEach((l: any) => {
      if (l.responsavel_usuario_id && !inactiveIds.has(l.responsavel_usuario_id)) seen.add(l.responsavel_usuario_id);
    });
    return Array.from(seen).sort().map(id => {
      const profile = profiles.find(p => p.id === id);
      return { value: id, label: profile?.name || 'Sem Nome' };
    });
  }, [leads, profiles]);

  // ─── Lead to Turma mapping ──────────────────────────────────────────────────
  const leadToTurma = useMemo(() => {
    const mapping: Record<string, any> = {};
    turmas.forEach(t => {
      t.attendees.forEach(a => {
        if (a.lead_id) mapping[a.lead_id] = { ...t, attendee: a };
      });
    });
    return mapping;
  }, [turmas]);

  // ─── Lead metrics (leadMetrics.ts) ─────────────────────────────────────────
  const stageMap = useMemo(() => buildStageMap(pipelines), [pipelines]);

  // ─── Filtered leads (date + search + stage + product + responsible) ─────────
  const filteredLeads = useMemo(() => {
    let result = leads as any[];
    if (startDate || endDate) {
      const s = startDate ? new Date(startDate) : null;
      const e = endDate ? new Date(endDate) : null;
      if (e) e.setHours(23, 59, 59, 999);

      result = result.filter(l => {
        const stageName = l.stage_id ? stageMap.get(l.stage_id) : '';
        const isWon = stageNameToStatus(stageName || l.status || '') === 'closed';

        const cDate = new Date(l.created_at);
        const wDate = l.won_at ? new Date(l.won_at) : null;
        const tDate = l.taxa_matricula_paid_at ? new Date(l.taxa_matricula_paid_at) : null;

        // B) Valor Restante (Turma)
        const tInfo = leadToTurma[l.id];
        const conclusionDateStr = tInfo?.date ? `${tInfo.date}T12:00:00` : (l.won_at || l.created_at);
        const conclusionDate = new Date(conclusionDateStr);

        const inCreatedRange = (!s || cDate >= s) && (!e || cDate <= e);
        const inWonRange = wDate && (!s || wDate >= s) && (!e || wDate <= e);
        const inTaxaRange = tDate && (!s || tDate >= s) && (!e || tDate <= e);
        const inTurmaRange = conclusionDate && (!s || conclusionDate >= s) && (!e || conclusionDate <= e);

        return inCreatedRange || inWonRange || inTaxaRange || inTurmaRange;
      });
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(l => l.name?.toLowerCase().includes(q) || l.product?.toLowerCase().includes(q) || l.responsible?.toLowerCase().includes(q));
    }
    if (filterStage !== 'all') result = result.filter(l => l.stage_id === filterStage);
    if (filterProduct !== 'all') result = result.filter(l => (l.product_id ?? l.product) === filterProduct);
    if (filterResponsible !== 'all') result = result.filter(l => l.responsavel_usuario_id === filterResponsible);

    // IMPORTANTE: Para o Dashboard Geral, não filtramos por vendedor logado nos cartões de topo,
    // permitindo ver o total da empresa. 
    // Se o usuário selecionou um vendedor no FILTRO, aí sim filtramos.
    if (filterResponsible === 'all' && currentSellerId && false) { // Desativado para mostrar total empresa
      // result = result.filter(l => l.responsavel_usuario_id === currentSellerId);
    }

    return result;
  }, [leads, searchTerm, filterStage, filterProduct, filterResponsible, startDate, endDate, currentSellerId, stageMap, leadToTurma]);

  const { totalSalesValue, totalReceivedValue, closedLeadsFiltered } = useMemo(() => {
    let salesValue = 0;
    let receivedValue = 0;
    const closed: any[] = [];

    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    if (e) e.setHours(23, 59, 59, 999);

    filteredLeads.forEach(l => {
      const stageName = l.stage_id ? stageMap.get(l.stage_id) : '';
      const isWon = stageNameToStatus(stageName || l.status || '') === 'closed';

      const cDate = new Date(l.created_at);
      const wDate = l.won_at ? new Date(l.won_at) : null;
      const inWonRange = wDate && (!s || wDate >= s) && (!e || wDate <= e);

      // 1. Contagem e Valor de Venda (Expectativa)
      const isStrictlyWon = (l: any) => {
        if (!l.won_at) return false;
        const wDate = new Date(l.won_at);
        return (!s || wDate >= s) && (!e || wDate <= e);
      };

      if (isStrictlyWon(l)) {
        closed.push(l);
        salesValue += getLeadEffectiveValue(l as any);
      }

      // 2. Receita Real (Fatiada)
      const tInfo = leadToTurma[l.id];
      const attendee = tInfo?.attendee;
      const feeVal = Number(attendee?.taxa_matricula_recebido || l.taxa_matricula_recebido || 0);
      const feePaidAt = attendee?.taxa_matricula_paid_at || l.taxa_matricula_paid_at;

      // A) Taxa
      if (feeVal > 0) {
        const tDate = feePaidAt ? new Date(feePaidAt) : (wDate || cDate);
        if ((!s || tDate >= s) && (!e || tDate <= e)) {
          receivedValue += feeVal;
        }
      }

      // B) Turma
      if (isWon) {
        const remaining = Number(attendee?.valor_recebido || l.valor_recebido || 0);
        if (remaining > 0) {
          const conclusionDateStr = tInfo?.date ? `${tInfo.date}T12:00:00` : (l.won_at || l.created_at);
          const conclusionDate = new Date(conclusionDateStr);
          if ((!s || conclusionDate >= s) && (!e || conclusionDate <= e)) {
            receivedValue += remaining;
          }
        }
      }
    });

    return {
      totalSalesValue: salesValue,
      totalReceivedValue: receivedValue,
      closedLeadsFiltered: closed
    };
  }, [filteredLeads, stageMap, startDate, endDate, products, leadToTurma]);

  // KPI "Total de Leads" — exclui Perdido, Desqualificado, Aquecimento e Não Compareceu na Turma
  const leadsCount = useMemo(() => {
    return filteredLeads.filter(l => {
      const stageName = l.stage_id ? stageMap.get(l.stage_id) : l.status;
      if (!stageName) return true;
      const n = stageName.toLowerCase();
      return (
        !n.includes('perdido') &&
        !n.includes('desqualificado') &&
        !n.includes('aquecimento') &&
        !n.includes('não compareceu') &&
        !n.includes('nao compareceu')
      );
    }).length;
  }, [filteredLeads, stageMap]);


  const closedLeadsCount = closedLeadsFiltered.length;
  const conversionRate = calcConversionRate(closedLeadsCount, leadsCount);

  // Leads atualmente na etapa "Ganho" (excluindo "Turma Concluido") — snapshot atual, sem filtro de data
  const ganhoStageLeadsCount = useMemo(() => {
    const pureGanhoIds = new Set(
      Array.from(stageMap.entries())
        .filter(([_, name]) => {
          const n = name.toLowerCase();
          return (n.includes('ganho') || n.includes('aprovado') || n.includes('fechado')) && !n.includes('conclu');
        })
        .map(([id]) => id)
    );
    return (leads as any[]).filter(l => l.stage_id && pureGanhoIds.has(l.stage_id)).length;
  }, [leads, stageMap]);

  const averageSalesCycle = useMemo(
    () => calcAverageSalesCycle(closedLeadsFiltered),
    [closedLeadsFiltered],
  );

  const inactiveLeadsCount = useMemo(
    () => calcInactiveLeads(filteredLeads, tasks, stageMap),
    [filteredLeads, tasks, stageMap],
  );

  const activeLeadsCount = useMemo(
    () => calcActiveLeads(leads as any[], stageMap, { searchTerm, filterProduct, filterResponsible, currentSellerId }),
    [leads, stageMap, searchTerm, filterProduct, filterResponsible, currentSellerId],
  );

  const totalConversionRate = activeLeadsCount > 0 ? (closedLeadsCount / activeLeadsCount) * 100 : 0;

  // ─── Financial totals ───────────────────────────────────────────────────────
  const concluStageIds = useMemo(
    () => new Set(Array.from(stageMap.entries()).filter(([_, name]) => name.toLowerCase().includes('conclu')).map(([id]) => id)),
    [stageMap],
  );

  const { pago: totalPago, pendente: totalPendente } = useMemo(
    () => calcPipelinePayments(
      filteredLeads,
      new Set(Array.from(stageMap.entries()).filter(([_, name]) => stageNameToStatus(name) === 'closed').map(([id]) => id)),
      leadToTurma,
      products,
      new Date(), // Referência para o mês atual
      concluStageIds,
    ),
    [filteredLeads, stageMap, leadToTurma, products, concluStageIds],
  );

  const totalGanhos = totalPago;
  const myGanhos = totalGanhos;
  const teamGanhos = 0;

  // ─── Turma metrics (turmaMetrics.ts) ───────────────────────────────────────
  const occupancyData = useMemo(() => getOccupancyData(turmas, leads as any[]), [turmas, leads]);

  const attendeeStages = useMemo(
    () => calcAttendeeStages(turmas as any),
    [turmas],
  );

  // ─── Seller metrics (sellerMetrics.ts) ─────────────────────────────────────
  const salesByResponsible = useMemo(
    () => calcSalesByResponsible(leads as any[], pipelines as any[], products, leadToTurma, startDate, endDate, filterProduct, currentSellerId),
    [leads, pipelines, products, leadToTurma, startDate, endDate, filterProduct, currentSellerId],
  );

  const allSellersRanking = useMemo(
    () => calcAllSellersRanking(salesByResponsible, vendedorProfiles, profiles as any, goals),
    [salesByResponsible, vendedorProfiles, profiles, goals],
  );

  const otherSellersRanking = useMemo(() => {
    return salesByResponsible
      .filter(s => {
        const sellerId = s.id;
        if (!sellerId || s.count === 0) return false;
        const profile = profiles.find(p => p.id === sellerId);
        if (profile?.status === 'inactive') return false;
        // Apenas quem NÃO é closer/vendedor vai para "Outros Ganhos"
        return profile ? !isVendedor(profile) : true;
      })
      .map(s => ({ id: s.id, label: s.label.trim(), value: s.value, received: s.received, count: s.count }))
      .sort((a, b) => b.count - a.count);
  }, [salesByResponsible, profiles]);

  const sellerSemaphoreData = useMemo(
    () => calcSellerSemaphore(allSellersRanking, otherSellersRanking, goals),
    [allSellersRanking, otherSellersRanking, goals],
  );

  // ─── Pipeline stage chart ───────────────────────────────────────────────────
  const EXCLUDED_STAGES = new Set(['Perdido', 'Desqualificado']);
  const pipelineStages = useMemo(() => {
    const pipeline = pipelines[0];
    if (pipeline?.stages?.length) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const countMap: Record<string, number> = {};
      const firstStageId = pipeline.stages[0]?.id;

      // Determine which stages are "Results" stages
      const isResultStage = (name: string) => {
        const n = name.toLowerCase();
        return n.includes('ganho') || n.includes('concluido') || n.includes('concluída');
      };

      // Process all leads for operational stages, but filter by month for result stages
      leads.forEach((l: any) => {
        // Apply basic filters (product, responsible, etc.) but ignore date for operational stages
        if (filterProduct !== 'all' && (l.product_id ?? l.product) !== filterProduct) return;
        if (filterResponsible !== 'all' && l.responsavel_usuario_id !== filterResponsible) return;
        if (currentSellerId && l.responsavel_usuario_id !== currentSellerId) return;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const match = l.name?.toLowerCase().includes(q) || l.product?.toLowerCase().includes(q) || l.responsible?.toLowerCase().includes(q);
          if (!match) return;
        }

        const stage = pipeline.stages.find((s: any) => s.id === l.stage_id);
        const stageName = stage?.name || '';

        if (isResultStage(stageName)) {
          // For result stages, only count if it happened this month
          const date = new Date(l.updated_at || l.created_at);
          if (date >= startOfMonth) {
            countMap[l.stage_id] = (countMap[l.stage_id] || 0) + 1;
          }
        } else {
          // For operational stages, count everything currently there
          const id = l.stage_id || firstStageId;
          if (id) countMap[id] = (countMap[id] || 0) + 1;
        }
      });

      return [...pipeline.stages]
        .sort((a, b) => a.position - b.position)
        .filter(s => !EXCLUDED_STAGES.has(s.name))
        .map(s => ({ id: s.id, label: s.name, value: countMap[s.id] || 0, color: s.color }));
    }
    return [
      { id: 'new', label: 'Novo', value: filteredLeads.filter((l: any) => stageNameToStatus(l.status) === 'new').length, color: 'hsl(210, 80%, 55%)' },
      { id: 'qualified', label: 'Qualificado', value: filteredLeads.filter((l: any) => stageNameToStatus(l.status) === 'qualified').length, color: 'hsl(142, 71%, 45%)' },
      { id: 'proposal', label: 'Proposta', value: filteredLeads.filter((l: any) => stageNameToStatus(l.status) === 'proposal').length, color: 'hsl(262, 80%, 55%)' },
      { id: 'closed', label: 'Fechado', value: closedLeadsCount, color: 'hsl(16, 85%, 55%)' },
    ];
  }, [pipelines, filteredLeads, closedLeadsCount, filterProduct, filterResponsible, currentSellerId, searchTerm, leads]);

  const funnelStagesWithRates = useMemo(() => computeFunnelRates(pipelineStages), [pipelineStages]);

  // ─── Monthly sales trend ────────────────────────────────────────────────────
  const dateIntervals = useMemo(() => {
    if (!startDate && !endDate) {
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        return { type: 'month', month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''), key: `${d.getFullYear()}-${d.getMonth()}` };
      });
    }
    const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const end = endDate ? new Date(endDate + 'T00:00:00') : new Date();
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 60) {
      return Array.from({ length: diffDays + 1 }, (_, i) => {
        const d = new Date(start); d.setDate(d.getDate() + i);
        return { type: 'day', day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` };
      });
    }
    const months = []; let d = new Date(start); d.setDate(1); const endMonth = new Date(end); endMonth.setDate(1);
    while (d <= endMonth) {
      months.push({ type: 'month', month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''), key: `${d.getFullYear()}-${d.getMonth()}` });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }, [startDate, endDate]);

  const monthlySales = useMemo(() => {
    const closedLeads = filteredLeads.filter((l: any) => {
      const p = pipelines[0];
      const sm = new Map(p?.stages?.map((s: any) => [s.id, s.name.toLowerCase()]) || []);
      const sName = l.stage_id ? sm.get(l.stage_id) : l.status?.toLowerCase();
      if (!sName) return false;
      return sName.includes('ganho') || sName.includes('fechado') || sName.includes('aprovado') || stageNameToStatus(sName) === 'closed';
    });
    const isDaily = dateIntervals.length > 0 && dateIntervals[0].type === 'day';
    const grouped = closedLeads.reduce((acc: Record<string, number>, lead: any) => {
      const dateStr = lead.last_contact_at || lead.created_at; if (!dateStr) return acc;
      const d = new Date(dateStr);
      const key = isDaily ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : `${d.getFullYear()}-${d.getMonth()}`;
      acc[key] = (acc[key] || 0) + 1; return acc;
    }, {});
    let cumulative = 0;
    return dateIntervals.map(d => {
      const val = grouped[d.key] || 0;
      if (isDaily) { cumulative += val; return { label: d.label, value: cumulative }; }
      return { label: d.label, value: val };
    });
  }, [filteredLeads, pipelines, dateIntervals]);

  const avgMonthlyLeads = monthlySales.reduce((sum, m) => sum + m.value, 0) / monthlySales.length || leads.length / 6;
  const avgTicket = totalSalesValue / closedLeadsCount || 1000;
  const predictiveData = useMemo(() => projectedRevenue(conversionRate, avgMonthlyLeads, avgTicket), [conversionRate, avgMonthlyLeads, avgTicket]);
  const trendData = useMemo(() => [...monthlySales.slice(-3), ...predictiveData], [monthlySales, predictiveData]);

  return {
    totalGanhos, myGanhos, teamGanhos,
    leadsCount,
    closedLeadsCount, ganhoStageLeadsCount, conversionRate, averageSalesCycle, inactiveLeadsCount,
    totalSalesValue, occupancyData, vendedorProfiles,
    allSellersRanking, otherSellersRanking, sellerSemaphoreData,
    totalReceivedValue, totalPendente,
    pipelineStages, funnelStagesWithRates, monthlySales, trendData,
    totalConversionRate, attendeeStages,
    availableProducts, availableResponsibles, activeLeadsCount,
  };
}
