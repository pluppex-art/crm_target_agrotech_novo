/**
 * Supabase Edge Function — daily-report
 *
 * Sends the daily CRM report via WhatsApp Business Cloud API (Meta) every day at 21:00 BRT.
 *
 * ─── Deploy ───────────────────────────────────────────────────────────────────
 *   supabase functions deploy daily-report
 *
 * ─── Schedule with pg_cron (run in Supabase SQL Editor) ─────────────────────
 *   select cron.schedule(
 *     'daily-report-21h',
 *     '0 0 * * *',  -- 00:00 UTC = 21:00 BRT (UTC-3)
 *     $$
 *       select net.http_post(
 *         url     := '<SUPABASE_URL>/functions/v1/daily-report',
 *         body    := '{}',
 *         headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>","Content-Type":"application/json"}'::jsonb
 *       );
 *     $$
 *   );
 *
 * ─── WhatsApp Business Cloud API (Meta) ──────────────────────────────────────
 *   1. Crie um app em https://developers.facebook.com/apps
 *   2. Adicione o produto "WhatsApp Business"
 *   3. Copie o Access Token e o Phone Number ID
 *   4. Salve na tabela report_settings:
 *      - key: waba_access_token  → value: <seu token>
 *      - key: waba_phone_number_id → value: <ex: 123456789012345>
 *   5. Os telefones dos líderes ficam em leader_contacts (JSON array)
 *
 * ─── Required env vars ────────────────────────────────────────────────────────
 *   SUPABASE_URL         — project URL
 *   SUPABASE_SERVICE_KEY — service role key
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getSetting(db: any, key: string, fallback = ''): Promise<string> {
  const { data } = await db
    .from('report_settings')
    .select('value')
    .eq('key', key)
    .single();
  return data?.value ?? fallback;
}

function todayBRT(): { start: string; end: string; label: string } {
  const now = new Date();
  // BRT = UTC-3
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const iso = brt.toISOString().slice(0, 10);
  const [y, m, d] = iso.split('-');
  return { start: iso, end: iso + 'T23:59:59', label: `${d}/${m}/${y}` };
}

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ─── WhatsApp Business Cloud API sender ──────────────────────────────────────

async function sendWhatsApp(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
): Promise<boolean> {
  const phone = to.replace(/\D/g, '');
  const recipient = phone.startsWith('55') ? phone : `55${phone}`;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: text },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`[daily-report] Failed to send to ${recipient}:`, err);
    return false;
  }

  console.log(`[daily-report] Sent to ${recipient} ✓`);
  return true;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchReportData(db: any, start: string, end: string) {
  const endFull = end.includes('T') ? end : end + 'T23:59:59';
  const [leadsRes, wonLeadsRes, tasksRes, callLogsRes, stageReasonsRes, turmasRes, enrollmentsRes] =
    await Promise.allSettled([
      db.from('leads').select('id, name, responsavel_usuario_id, responsible, value, created_at')
        .gte('created_at', start).lte('created_at', endFull),
      db.from('leads').select('id, value, responsavel_usuario_id, responsible, won_at')
        .gte('won_at', start).lte('won_at', endFull).not('won_at', 'is', null),
      db.from('tasks').select('id, title, status, lead_id, responsavel_usuario_id, due_date, category')
        .gte('due_date', start).lte('due_date', endFull),
      db.from('call_logs').select('id, user_id, lead_id, type, called_at')
        .gte('called_at', start).lte('called_at', endFull),
      db.from('lead_stage_reasons').select('reason, stage_name, lead_id')
        .gte('recorded_at', start).lte('recorded_at', endFull),
      db.from('turmas').select('id, name, location, student_goal, status').not('status', 'eq', 'cancelada'),
      db.from('lead_class_enrollments').select('id, turma_id, status').neq('status', 'CANCELLED'),
    ]);

  return {
    leads:        leadsRes.status === 'fulfilled'        ? (leadsRes.value.data ?? [])        : [],
    wonLeads:     wonLeadsRes.status === 'fulfilled'     ? (wonLeadsRes.value.data ?? [])     : [],
    tasks:        tasksRes.status === 'fulfilled'        ? (tasksRes.value.data ?? [])        : [],
    callLogs:     callLogsRes.status === 'fulfilled'     ? (callLogsRes.value.data ?? [])     : [],
    stageReasons: stageReasonsRes.status === 'fulfilled' ? (stageReasonsRes.value.data ?? []) : [],
    turmas:       turmasRes.status === 'fulfilled'       ? (turmasRes.value.data ?? [])       : [],
    enrollments:  enrollmentsRes.status === 'fulfilled'  ? (enrollmentsRes.value.data ?? [])  : [],
  };
}

// ─── Metrics computation ─────────────────────────────────────────────────────

function computeMetrics(raw: any, commissionRate: number) {
  const { leads, wonLeads, tasks, callLogs, stageReasons, turmas, enrollments } = raw;

  const leadsReceived = leads.length;
  const respondedIds = new Set([
    ...tasks.map((t: any) => t.lead_id),
    ...callLogs.map((c: any) => c.lead_id),
  ].filter(Boolean));
  const leadsResponded = leads.filter((l: any) => respondedIds.has(l.id)).length;
  const leadsNotAttended = Math.max(leadsReceived - leadsResponded, 0);

  const perdidoReasons = stageReasons.filter((r: any) =>
    (r.stage_name ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes('perdido'),
  );
  const leadsDisqualified = new Set(perdidoReasons.map((r: any) => r.lead_id)).size;
  const reasonCounts: Record<string, number> = {};
  perdidoReasons.forEach((r: any) => { reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1; });
  const disqualificationReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const leadsAwaitingReturn = new Set(
    tasks.filter((t: any) => t.status === 'pending').map((t: any) => t.lead_id).filter(Boolean),
  ).size;

  // Sellers
  const sellerMap = new Map<string, any>();
  leads.forEach((l: any) => {
    if (!l.responsavel_usuario_id || !l.responsible) return;
    if (!sellerMap.has(l.responsavel_usuario_id))
      sellerMap.set(l.responsavel_usuario_id, { name: l.responsible, lr: 0, cm: 0, tc: 0, tt: 0, sc: 0 });
    sellerMap.get(l.responsavel_usuario_id).lr++;
  });
  callLogs.forEach((c: any) => { if (c.user_id && sellerMap.has(c.user_id)) sellerMap.get(c.user_id).cm++; });
  tasks.forEach((t: any) => {
    if (!t.responsavel_usuario_id || !sellerMap.has(t.responsavel_usuario_id)) return;
    const s = sellerMap.get(t.responsavel_usuario_id);
    s.tt++;
    if (t.status === 'completed') s.tc++;
  });
  wonLeads.forEach((l: any) => { if (l.responsavel_usuario_id && sellerMap.has(l.responsavel_usuario_id)) sellerMap.get(l.responsavel_usuario_id).sc++; });
  const sellers = Array.from(sellerMap.entries()).map(([, s]) => ({
    name: s.name,
    leadsReceived: s.lr,
    callsMade: s.cm,
    tasksCompleted: s.tc,
    salesClosed: s.sc,
    productivity: s.tt > 0 ? Math.min(Math.round((s.tc / s.tt) * 100), 100) : Math.min(Math.round((s.cm / Math.max(s.lr, 1)) * 100), 100),
  }));

  // Follow-up
  const fuAll = tasks.filter((t: any) =>
    (t.category ?? '').toLowerCase().includes('follow') ||
    (t.title ?? '').toLowerCase().includes('follow') ||
    (t.title ?? '').toLowerCase().includes('retorno'),
  );
  const fu = fuAll.length > 0 ? fuAll : tasks;
  const followUpsScheduled = fu.length;
  const followUpsDone = fu.filter((t: any) => t.status === 'completed').length;
  const followUpsPending = Math.max(followUpsScheduled - followUpsDone, 0);
  const followUpRate = followUpsScheduled > 0 ? Math.round((followUpsDone / followUpsScheduled) * 100) : 0;

  // Results
  const salesCount = wonLeads.length;
  const revenueGenerated = wonLeads.reduce((s: number, l: any) => s + (parseFloat(String(l.value)) || 0), 0);
  const commission = revenueGenerated * (commissionRate / 100);

  // Turmas
  const turmaReports = turmas.map((t: any) => {
    const confirmed = enrollments.filter((e: any) => e.turma_id === t.id).length;
    const goal = t.student_goal ?? 25;
    return { name: t.name, location: t.location ?? '', goal, confirmed, remaining: Math.max(goal - confirmed, 0) };
  });

  // Alerts
  const alerts: string[] = [];
  if (leadsNotAttended > 5) alerts.push(`🔴 ${leadsNotAttended} leads não atendidos hoje`);
  if (followUpsPending > 10) alerts.push(`🔴 ${followUpsPending} follow-ups não executados`);
  else if (followUpsPending > 0) alerts.push(`🟡 ${followUpsPending} follow-ups ficaram pendentes`);
  sellers.forEach(s => {
    if (s.productivity < 50 && s.leadsReceived > 0)
      alerts.push(`🔴 ${s.name} com produtividade baixa (${s.productivity}%)`);
  });
  if (followUpRate >= 80) alerts.push(`🟢 Taxa de follow-up dentro da meta (${followUpRate}%)`);

  // Summary
  const bottlenecks = [
    followUpsPending > 5 && `baixa execução de follow-ups`,
    sellers.filter(s => s.productivity < 50 && s.leadsReceived > 0).map(s => s.name).join(', ') && `produtividade baixa`,
    leadsNotAttended > 5 && `${leadsNotAttended} leads sem atendimento`,
  ].filter(Boolean) as string[];
  const executiveSummary = bottlenecks.length > 0
    ? `O principal gargalo do dia foi ${bottlenecks.join(' e ')}.`
    : leadsReceived === 0
      ? 'Nenhum lead recebido hoje.'
      : `Dia com bom desempenho. ${leadsReceived} leads recebidos com ${leadsReceived > 0 ? Math.round((leadsResponded / leadsReceived) * 100) : 0}% de resposta.`;

  return { leadsReceived, leadsResponded, leadsNotAttended, leadsDisqualified, leadsAwaitingReturn, disqualificationReasons, sellers, followUpsScheduled, followUpsDone, followUpsPending, followUpRate, salesCount, revenueGenerated, commission, turmaReports, alerts, executiveSummary };
}

// ─── Text formatter ───────────────────────────────────────────────────────────

function buildText(m: ReturnType<typeof computeMetrics>, dateLabel: string, company: string): string {
  const pct = (n: number, d: number) => d > 0 ? `${Math.round((n / d) * 100)}%` : '0%';
  const L = (s: string) => `\n${s}`;
  const sep = () => `\n━━━━━━━━━━━━━━━`;

  let t = `📊 RELATÓRIO DIÁRIO ${company}\n\n📅 Data: ${dateLabel}`;

  t += `${sep()}\nFUNIL DO DIA${sep()}\n`;
  t += L(`Leads recebidos: ${m.leadsReceived}`);
  t += L(`Leads respondidos: ${m.leadsResponded} (${pct(m.leadsResponded, m.leadsReceived)})`);
  t += L(`Leads não atendidos: ${m.leadsNotAttended}`);

  if (m.leadsDisqualified > 0 || m.disqualificationReasons.length > 0) {
    t += `\n${sep()}\nSDR / QUALIFICAÇÃO${sep()}\n`;
    t += L(`Leads desqualificados: ${m.leadsDisqualified}`);
    t += L(`Aguardando retorno: ${m.leadsAwaitingReturn}`);
    if (m.disqualificationReasons.length > 0) {
      t += `\n\nMotivos mais comuns de desqualificação:\n`;
      m.disqualificationReasons.forEach((r, i) => { t += `\n${i + 1}. ${r.reason} (${r.count})`; });
    }
  }

  if (m.sellers.length > 0) {
    t += `\n${sep()}\nCOMERCIAL${sep()}`;
    m.sellers.forEach(s => {
      t += `\n\n${s.name}`;
      t += `\n• Leads recebidos: ${s.leadsReceived}`;
      t += `\n• Ligações realizadas: ${s.callsMade}`;
      t += `\n• Tarefas concluídas: ${s.tasksCompleted}`;
      t += `\n• Vendas: ${s.salesClosed}`;
      t += `\n• Produtividade: ${s.productivity}%`;
    });
  }

  t += `\n${sep()}\nFOLLOW-UP${sep()}\n`;
  t += L(`Follow-ups previstos: ${m.followUpsScheduled}`);
  t += L(`Follow-ups realizados: ${m.followUpsDone}`);
  t += `\n\nTaxa execução: ${m.followUpRate}%`;
  if (m.followUpsPending > 0) t += `\n\n⚠️ ${m.followUpsPending} follow-ups ficaram pendentes.`;

  t += `\n${sep()}\nRESULTADOS${sep()}\n`;
  t += L(`Vendas do dia: ${m.salesCount}`);
  t += `\n\nFaturamento gerado:\n${brl(m.revenueGenerated)}`;
  t += `\n\nComissão Pluppex:\n${brl(m.commission)}`;

  if (m.turmaReports.length > 0) {
    t += `\n${sep()}\nTURMAS${sep()}`;
    m.turmaReports.forEach((tr: any) => {
      t += `\n\n${tr.name}${tr.location ? ` - ${tr.location}` : ''}`;
      t += `\nMeta: ${tr.goal} alunos`;
      t += `\nConfirmados: ${tr.confirmed}`;
      t += `\nFaltam: ${tr.remaining}`;
    });
  }

  if (m.alerts.length > 0) {
    t += `\n${sep()}\nALERTAS DO DIA${sep()}\n`;
    m.alerts.forEach(a => { t += `\n${a}`; });
  }

  t += `\n${sep()}\nRESUMO EXECUTIVO${sep()}\n\n${m.executiveSummary}`;

  return t;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Load settings
    const [company, rateStr, enabled, contactsJson, accessToken, phoneNumberId] =
      await Promise.all([
        getSetting(db, 'company_name', 'TARGET AGROTECH'),
        getSetting(db, 'commission_rate', '18'),
        getSetting(db, 'report_enabled', 'true'),
        getSetting(db, 'leader_contacts', '[]'),
        getSetting(db, 'waba_access_token', ''),
        getSetting(db, 'waba_phone_number_id', ''),
      ]);

    if (enabled !== 'true') {
      return new Response(JSON.stringify({ ok: true, message: 'Report disabled' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contacts: { name: string; phone: string }[] = JSON.parse(contactsJson);
    const commissionRate = parseFloat(rateStr) || 18;

    const { start, end, label } = todayBRT();
    console.log(`[daily-report] Generating for ${label}`);

    const raw = await fetchReportData(db, start, end);
    const metrics = computeMetrics(raw, commissionRate);
    const reportText = buildText(metrics, label, company);

    // Validate WABA credentials
    if (!accessToken || !phoneNumberId) {
      console.warn('[daily-report] WhatsApp Business API not configured. Skipping send.');
      return new Response(
        JSON.stringify({ ok: true, sent: 0, message: 'WABA credentials not set in report_settings', report: reportText }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Send to each leader
    const results = await Promise.all(
      contacts.filter(c => c.phone).map(async c => {
        const sent = await sendWhatsApp(phoneNumberId, accessToken, c.phone, reportText);
        return { name: c.name, phone: c.phone, sent };
      }),
    );

    const sentCount = results.filter(r => r.sent).length;
    console.log(`[daily-report] Done. Sent to ${sentCount}/${results.length} leaders.`);

    return new Response(
      JSON.stringify({ ok: true, date: label, sent: sentCount, recipients: results }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[daily-report] Error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
