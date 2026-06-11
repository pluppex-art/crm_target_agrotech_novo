import { supabase as _supabase } from '../lib/supabase';
const supabase = _supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SellerReport {
  id: string;
  name: string;
  leadsReceived: number;
  callsMade: number;
  tasksCompleted: number;
  salesClosed: number;
  productivity: number;
}

export interface TurmaReport {
  id: string;
  name: string;
  location: string;
  goal: number;
  confirmed: number;
  remaining: number;
}

export interface ReportAlert {
  level: 'red' | 'yellow' | 'green';
  message: string;
}

export interface DailyReportData {
  startDate: string;
  endDate: string;
  dateLabel: string;
  // Funil
  leadsReceived: number;
  leadsResponded: number;
  leadsNotAttended: number;
  responseRate: number;
  // SDR
  leadsDisqualified: number;
  leadsAwaitingReturn: number;
  disqualificationReasons: { reason: string; count: number }[];
  // Comercial
  sellers: SellerReport[];
  // Follow-up
  followUpsScheduled: number;
  followUpsDone: number;
  followUpsPending: number;
  followUpRate: number;
  // Resultados
  salesCount: number;
  revenueGenerated: number;
  commission: number;
  // Turmas
  turmas: TurmaReport[];
  // Alerts + Summary
  alerts: ReportAlert[];
  executiveSummary: string;
}

export type ReportPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDateRangeForPeriod(
  period: ReportPeriod,
  referenceDate: string,
  customStart?: string,
  customEnd?: string,
): { start: string; end: string; label: string } {
  const ref = new Date(referenceDate + 'T12:00:00');

  if (period === 'custom' && customStart && customEnd) {
    return {
      start: customStart,
      end: customEnd + 'T23:59:59',
      label: `${formatDateBR(customStart)} a ${formatDateBR(customEnd)}`,
    };
  }

  if (period === 'day') {
    const d = ref.toISOString().slice(0, 10);
    return { start: d, end: d + 'T23:59:59', label: formatDateBR(d) };
  }

  if (period === 'week') {
    const day = ref.getDay();
    const mon = new Date(ref);
    mon.setDate(ref.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const start = mon.toISOString().slice(0, 10);
    const end = sun.toISOString().slice(0, 10);
    return { start, end: end + 'T23:59:59', label: `${formatDateBR(start)} a ${formatDateBR(end)}` };
  }

  if (period === 'month') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).toISOString().slice(0, 10);
    const monthName = ref.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    return { start, end: end + 'T23:59:59', label: monthName.charAt(0).toUpperCase() + monthName.slice(1) };
  }

  if (period === 'year') {
    const start = `${ref.getFullYear()}-01-01`;
    const end = `${ref.getFullYear()}-12-31`;
    return { start, end: end + 'T23:59:59', label: String(ref.getFullYear()) };
  }

  const d = ref.toISOString().slice(0, 10);
  return { start: d, end: d + 'T23:59:59', label: formatDateBR(d) };
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// ─── Main service ─────────────────────────────────────────────────────────────

export const reportDataService = {
  async getReportData(start: string, end: string, dateLabel: string): Promise<DailyReportData> {
    const endFull = end.includes('T') ? end : end + 'T23:59:59';

    const [leadsRes, wonLeadsRes, tasksRes, callLogsRes, stageReasonsRes, turmasRes, enrollmentsRes] =
      await Promise.allSettled([
        // All leads created in period
        supabase
          .from('leads')
          .select('id, name, responsavel_usuario_id, responsible, stage_id, value, created_at')
          .gte('created_at', start)
          .lte('created_at', endFull),

        // Won leads in period (moved to Ganho)
        supabase
          .from('leads')
          .select('id, value, responsavel_usuario_id, responsible, won_at')
          .gte('won_at', start)
          .lte('won_at', endFull)
          .not('won_at', 'is', null),

        // Tasks with due_date in period
        supabase
          .from('tasks')
          .select('id, title, status, lead_id, responsavel_usuario_id, due_date, category')
          .gte('due_date', start)
          .lte('due_date', endFull),

        // Calls made in period
        supabase
          .from('call_logs')
          .select('id, user_id, lead_id, type, called_at')
          .gte('called_at', start)
          .lte('called_at', endFull),

        // Stage reasons in period
        supabase
          .from('lead_stage_reasons')
          .select('reason, stage_name, lead_id')
          .gte('recorded_at', start)
          .lte('recorded_at', endFull),

        // Active turmas
        supabase
          .from('turmas')
          .select('id, name, location, student_goal, status')
          .not('status', 'eq', 'cancelada'),

        // All confirmed enrollments
        supabase
          .from('lead_class_enrollments')
          .select('id, turma_id, status')
          .neq('status', 'CANCELLED'),
      ]);

    const leads: any[]       = leadsRes.status === 'fulfilled'        ? (leadsRes.value.data ?? [])        : [];
    const wonLeads: any[]    = wonLeadsRes.status === 'fulfilled'     ? (wonLeadsRes.value.data ?? [])     : [];
    const tasks: any[]       = tasksRes.status === 'fulfilled'        ? (tasksRes.value.data ?? [])        : [];
    const callLogs: any[]    = callLogsRes.status === 'fulfilled'     ? (callLogsRes.value.data ?? [])     : [];
    const stageReasons: any[]= stageReasonsRes.status === 'fulfilled' ? (stageReasonsRes.value.data ?? []) : [];
    const turmas: any[]      = turmasRes.status === 'fulfilled'       ? (turmasRes.value.data ?? [])       : [];
    const enrollments: any[] = enrollmentsRes.status === 'fulfilled'  ? (enrollmentsRes.value.data ?? []) : [];

    // ── Funil ──────────────────────────────────────────────────────────────────
    const leadsReceived = leads.length;
    const leadIdsWithTask = new Set(tasks.map((t: any) => t.lead_id).filter(Boolean));
    const leadIdsWithCall = new Set(callLogs.map((c: any) => c.lead_id).filter(Boolean));
    const respondedIds = new Set([...leadIdsWithTask, ...leadIdsWithCall]);
    const leadsResponded = leads.filter((l: any) => respondedIds.has(l.id)).length;
    const leadsNotAttended = Math.max(leadsReceived - leadsResponded, 0);
    const responseRate = leadsReceived > 0 ? Math.round((leadsResponded / leadsReceived) * 100) : 0;

    // ── SDR ────────────────────────────────────────────────────────────────────
    const perdidoReasons = stageReasons.filter((r: any) =>
      (r.stage_name ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes('perdido'),
    );
    const leadsDisqualified = new Set(perdidoReasons.map((r: any) => r.lead_id)).size;

    const reasonCounts: Record<string, number> = {};
    perdidoReasons.forEach((r: any) => {
      reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
    });
    const disqualificationReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const pendingTasks = tasks.filter((t: any) => t.status === 'pending');
    const leadsAwaitingReturn = new Set(pendingTasks.map((t: any) => t.lead_id).filter(Boolean)).size;

    // ── Sellers ────────────────────────────────────────────────────────────────
    const sellerMap = new Map<string, {
      name: string;
      leadsReceived: number;
      callsMade: number;
      tasksCompleted: number;
      tasksTotal: number;
      salesClosed: number;
    }>();

    const ensureSeller = (id: string, name: string) => {
      if (!sellerMap.has(id)) {
        sellerMap.set(id, { name, leadsReceived: 0, callsMade: 0, tasksCompleted: 0, tasksTotal: 0, salesClosed: 0 });
      }
    };

    leads.forEach((l: any) => {
      if (l.responsavel_usuario_id && l.responsible) {
        ensureSeller(l.responsavel_usuario_id, l.responsible);
        sellerMap.get(l.responsavel_usuario_id)!.leadsReceived++;
      }
    });

    callLogs.forEach((c: any) => {
      if (c.user_id) {
        // Seller may not have leads in this period but still made calls
        if (!sellerMap.has(c.user_id)) return;
        sellerMap.get(c.user_id)!.callsMade++;
      }
    });

    tasks.forEach((t: any) => {
      if (t.responsavel_usuario_id && sellerMap.has(t.responsavel_usuario_id)) {
        const s = sellerMap.get(t.responsavel_usuario_id)!;
        s.tasksTotal++;
        if (t.status === 'completed') s.tasksCompleted++;
      }
    });

    wonLeads.forEach((l: any) => {
      if (l.responsavel_usuario_id && sellerMap.has(l.responsavel_usuario_id)) {
        sellerMap.get(l.responsavel_usuario_id)!.salesClosed++;
      }
    });

    const sellers: SellerReport[] = Array.from(sellerMap.entries())
      .map(([id, s]) => ({
        id,
        name: s.name,
        leadsReceived: s.leadsReceived,
        callsMade: s.callsMade,
        tasksCompleted: s.tasksCompleted,
        salesClosed: s.salesClosed,
        productivity: s.tasksTotal > 0
          ? Math.min(Math.round((s.tasksCompleted / s.tasksTotal) * 100), 100)
          : s.leadsReceived > 0
            ? Math.min(Math.round((s.callsMade / Math.max(s.leadsReceived, 1)) * 100), 100)
            : 0,
      }))
      .sort((a, b) => b.salesClosed - a.salesClosed || b.leadsReceived - a.leadsReceived);

    // ── Follow-up ──────────────────────────────────────────────────────────────
    const isFollowUp = (t: any) =>
      (t.category ?? '').toLowerCase().includes('follow') ||
      (t.category ?? '').toLowerCase().includes('retorno') ||
      (t.title ?? '').toLowerCase().includes('follow') ||
      (t.title ?? '').toLowerCase().includes('retorno');

    const fuTasks = tasks.filter(isFollowUp);
    const followUpsScheduled = fuTasks.length || tasks.length; // fallback to all tasks
    const followUpsDone = (fuTasks.length > 0 ? fuTasks : tasks).filter(
      (t: any) => t.status === 'completed',
    ).length;
    const followUpsPending = Math.max(followUpsScheduled - followUpsDone, 0);
    const followUpRate = followUpsScheduled > 0
      ? Math.round((followUpsDone / followUpsScheduled) * 100)
      : 0;

    // ── Results ────────────────────────────────────────────────────────────────
    const salesCount = wonLeads.length;
    const revenueGenerated = wonLeads.reduce(
      (sum: number, l: any) => sum + (parseFloat(String(l.value)) || 0), 0,
    );
    const commission = revenueGenerated * 0.18;

    // ── Turmas ─────────────────────────────────────────────────────────────────
    const turmaReports: TurmaReport[] = turmas.map((t: any) => {
      const confirmed = enrollments.filter((e: any) => e.turma_id === t.id).length;
      const goal = t.student_goal ?? 25;
      return {
        id: t.id,
        name: t.name ?? '',
        location: t.location ?? '',
        goal,
        confirmed,
        remaining: Math.max(goal - confirmed, 0),
      };
    });

    // ── Alerts ─────────────────────────────────────────────────────────────────
    const alerts: ReportAlert[] = [];

    if (leadsNotAttended > 5) {
      alerts.push({ level: 'red', message: `${leadsNotAttended} lead(s) não atendidos no período` });
    }
    if (followUpsPending > 10) {
      alerts.push({ level: 'red', message: `${followUpsPending} follow-ups não executados` });
    } else if (followUpsPending > 0) {
      alerts.push({ level: 'yellow', message: `${followUpsPending} follow-ups ficaram pendentes` });
    }
    sellers.forEach(s => {
      if (s.productivity < 50 && (s.leadsReceived > 0 || s.callsMade > 0)) {
        alerts.push({ level: 'red', message: `${s.name} com produtividade baixa (${s.productivity}%)` });
      }
    });
    if (followUpRate >= 80) {
      alerts.push({ level: 'green', message: `Taxa de follow-up dentro da meta (${followUpRate}%)` });
    }
    if (leadsReceived > 0 && responseRate >= 90) {
      alerts.push({ level: 'green', message: `Taxa de resposta excelente (${responseRate}%)` });
    }
    if (salesCount === 0 && leadsReceived > 10) {
      alerts.push({ level: 'yellow', message: `Nenhuma venda registrada no período com ${leadsReceived} leads recebidos` });
    }

    // ── Executive Summary ──────────────────────────────────────────────────────
    const bottlenecks: string[] = [];
    if (followUpsPending > 5) bottlenecks.push(`baixa execução de follow-ups (${followUpsPending} pendentes)`);
    const lowProd = sellers.filter(s => s.productivity < 50 && s.leadsReceived > 0);
    if (lowProd.length > 0) bottlenecks.push(`produtividade baixa em ${lowProd.map(s => s.name).join(', ')}`);
    if (leadsNotAttended > 5) bottlenecks.push(`${leadsNotAttended} leads sem atendimento`);

    let executiveSummary: string;
    if (leadsReceived === 0) {
      executiveSummary = 'Nenhum lead recebido neste período. Verifique as fontes de captação.';
    } else if (bottlenecks.length > 0) {
      executiveSummary = `O principal gargalo do período foi ${bottlenecks.join(' e ')}. Se a equipe atingisse a meta mínima de atividades, o potencial de conversão poderia ser significativamente maior.`;
    } else {
      executiveSummary = `Período com bom desempenho geral. ${leadsReceived} leads recebidos com ${responseRate}% de taxa de resposta${salesCount > 0 ? ` e ${salesCount} venda(s) fechada(s)` : ''}.`;
    }

    return {
      startDate: start,
      endDate: endFull,
      dateLabel,
      leadsReceived,
      leadsResponded,
      leadsNotAttended,
      responseRate,
      leadsDisqualified,
      leadsAwaitingReturn,
      disqualificationReasons,
      sellers,
      followUpsScheduled,
      followUpsDone,
      followUpsPending,
      followUpRate,
      salesCount,
      revenueGenerated,
      commission,
      turmas: turmaReports,
      alerts,
      executiveSummary,
    };
  },

  /** Generates the WhatsApp-ready plain text report */
  formatAsText(data: DailyReportData, companyName = 'TARGET AGROTECH'): string {
    const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const pct = (n: number, d: number) => d > 0 ? `${Math.round((n / d) * 100)}%` : '0%';

    const lines: string[] = [
      `📊 RELATÓRIO DIÁRIO ${companyName}`,
      ``,
      `📅 Período: ${data.dateLabel}`,
      ``,
      `━━━━━━━━━━━━━━━`,
      `FUNIL DO DIA`,
      `━━━━━━━━━━━━━━━`,
      ``,
      `Leads recebidos: ${data.leadsReceived}`,
      `Leads respondidos: ${data.leadsResponded} (${pct(data.leadsResponded, data.leadsReceived)})`,
      `Leads não atendidos: ${data.leadsNotAttended}`,
      ``,
    ];

    if (data.disqualificationReasons.length > 0 || data.leadsDisqualified > 0) {
      lines.push(
        `━━━━━━━━━━━━━━━`,
        `SDR / QUALIFICAÇÃO`,
        `━━━━━━━━━━━━━━━`,
        ``,
        `Leads desqualificados: ${data.leadsDisqualified}`,
        `Aguardando retorno: ${data.leadsAwaitingReturn}`,
        ``,
      );
      if (data.disqualificationReasons.length > 0) {
        lines.push('Motivos mais comuns de desqualificação:', '');
        data.disqualificationReasons.forEach((r, i) => {
          lines.push(`${i + 1}. ${r.reason} (${r.count})`);
        });
        lines.push('');
      }
    }

    if (data.sellers.length > 0) {
      lines.push(`━━━━━━━━━━━━━━━`, `COMERCIAL`, `━━━━━━━━━━━━━━━`, ``);
      data.sellers.forEach(s => {
        lines.push(
          s.name,
          `• Leads recebidos: ${s.leadsReceived}`,
          `• Ligações realizadas: ${s.callsMade}`,
          `• Tarefas concluídas: ${s.tasksCompleted}`,
          `• Vendas: ${s.salesClosed}`,
          `• Produtividade: ${s.productivity}%`,
          ``,
        );
      });
    }

    lines.push(
      `━━━━━━━━━━━━━━━`,
      `FOLLOW-UP`,
      `━━━━━━━━━━━━━━━`,
      ``,
      `Follow-ups previstos: ${data.followUpsScheduled}`,
      `Follow-ups realizados: ${data.followUpsDone}`,
      ``,
      `Taxa execução: ${data.followUpRate}%`,
    );
    if (data.followUpsPending > 0) {
      lines.push(``, `⚠️ ${data.followUpsPending} follow-ups ficaram pendentes.`);
    }

    lines.push(
      ``,
      `━━━━━━━━━━━━━━━`,
      `RESULTADOS`,
      `━━━━━━━━━━━━━━━`,
      ``,
      `Vendas do dia: ${data.salesCount}`,
      ``,
      `Faturamento gerado:`,
      `R$ ${brl(data.revenueGenerated)}`,
      ``,
      `Comissão Pluppex:`,
      `R$ ${brl(data.commission)}`,
    );

    if (data.turmas.length > 0) {
      lines.push(``, `━━━━━━━━━━━━━━━`, `TURMAS`, `━━━━━━━━━━━━━━━`, ``);
      data.turmas.forEach(t => {
        const loc = t.location ? ` - ${t.location}` : '';
        lines.push(
          `${t.name}${loc}`,
          `Meta: ${t.goal} alunos`,
          `Confirmados: ${t.confirmed}`,
          `Faltam: ${t.remaining}`,
          ``,
        );
      });
    }

    if (data.alerts.length > 0) {
      lines.push(`━━━━━━━━━━━━━━━`, `ALERTAS DO DIA`, `━━━━━━━━━━━━━━━`, ``);
      data.alerts.forEach(a => {
        const icon = a.level === 'red' ? '🔴' : a.level === 'yellow' ? '🟡' : '🟢';
        lines.push(`${icon} ${a.message}`);
      });
      lines.push('');
    }

    lines.push(
      `━━━━━━━━━━━━━━━`,
      `RESUMO EXECUTIVO`,
      `━━━━━━━━━━━━━━━`,
      ``,
      data.executiveSummary,
    );

    return lines.join('\n');
  },
};
