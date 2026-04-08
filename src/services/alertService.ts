import { Lead } from '../types/leads';
import { emailService } from './emailService';

const ALERT_12H_MS = 12 * 60 * 60 * 1000;
const ALERT_18H_MS = 18 * 60 * 60 * 1000;
const AUTO_TRANSFER_48H_MS = 48 * 60 * 60 * 1000;

const SENT_ALERTS_KEY = 'crm_sent_alerts';

function getSentAlerts(): Record<string, { h12?: boolean; h18?: boolean }> {
  try {
    return JSON.parse(localStorage.getItem(SENT_ALERTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function markAlertSent(leadId: string, type: 'h12' | 'h18') {
  const sent = getSentAlerts();
  sent[leadId] = { ...sent[leadId], [type]: true };
  localStorage.setItem(SENT_ALERTS_KEY, JSON.stringify(sent));
}

function clearAlertRecord(leadId: string) {
  const sent = getSentAlerts();
  delete sent[leadId];
  localStorage.setItem(SENT_ALERTS_KEY, JSON.stringify(sent));
}

// Reset alert records when a lead gets new contact (call this from note/task creation)
export function resetLeadAlerts(leadId: string) {
  clearAlertRecord(leadId);
}

function getMsWithoutContact(lead: Lead): number {
  const referenceTime = lead.last_contact_at ?? lead.created_at;
  return Date.now() - new Date(referenceTime).getTime();
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendOSNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

function openWhatsApp(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, '');
  const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

async function sendEmailAlert(userEmail: string, lead: Lead, hoursElapsed: number) {
  try {
    await emailService.sendEmail({
      to: userEmail,
      subject: `⚠️ Alerta CRM: Cliente "${lead.name}" sem contato há ${hoursElapsed}h`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Alerta de Inatividade</h2>
          <p>O cliente <strong>${lead.name}</strong> está sem contato há <strong>${hoursElapsed} horas</strong>.</p>
          <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding:8px; color:#6b7280;">Produto:</td><td style="padding:8px;"><strong>${lead.product}</strong></td></tr>
            <tr><td style="padding:8px; color:#6b7280;">Telefone:</td><td style="padding:8px;"><strong>${lead.phone}</strong></td></tr>
            <tr><td style="padding:8px; color:#6b7280;">Responsável:</td><td style="padding:8px;"><strong>${lead.responsible || 'Não definido'}</strong></td></tr>
          </table>
          <p style="color:#dc2626; font-weight:bold;">Acesse o CRM e entre em contato imediatamente para não perder esta oportunidade!</p>
        </div>
      `,
    });
  } catch (err) {
    console.warn('Falha ao enviar e-mail de alerta:', err);
  }
}

export interface InactivityAlert {
  lead: Lead;
  hoursElapsed: number;
  type: '12h' | '18h';
}

export interface InactivityCheckResult {
  alerts: InactivityAlert[];
  toTransfer: Lead[];
}

export function checkLeadInactivity(leads: Lead[]): InactivityCheckResult {
  const sentAlerts = getSentAlerts();
  const alerts: InactivityAlert[] = [];
  const toTransfer: Lead[] = [];

  for (const lead of leads) {
    // Skip closed leads from inactivity checks
    if (lead.status === 'closed') continue;

    const elapsed = getMsWithoutContact(lead);
    const leadSent = sentAlerts[lead.id] || {};

    if (elapsed >= AUTO_TRANSFER_48H_MS) {
      toTransfer.push(lead);
    } else if (elapsed >= ALERT_18H_MS && !leadSent.h18) {
      alerts.push({ lead, hoursElapsed: 18, type: '18h' });
    } else if (elapsed >= ALERT_12H_MS && !leadSent.h12) {
      alerts.push({ lead, hoursElapsed: 12, type: '12h' });
    }
  }

  return { alerts, toTransfer };
}

export async function fireAlerts(
  alerts: InactivityAlert[],
  userEmail: string,
  userPhone?: string
) {
  for (const alert of alerts) {
    const { lead, hoursElapsed, type } = alert;
    const title = `⚠️ ${lead.name} sem contato há ${hoursElapsed}h`;
    const body = `Responsável: ${lead.responsible || 'Não definido'} | Produto: ${lead.product}`;

    // OS Notification
    sendOSNotification(title, body);

    // Email to responsible
    if (userEmail) {
      await sendEmailAlert(userEmail, lead, hoursElapsed);
    }

    // WhatsApp to responsible (if phone provided)
    if (userPhone) {
      const msg = `⚠️ *Alerta CRM*\n\nO cliente *${lead.name}* está sem contato há *${hoursElapsed} horas*.\n\nProduto: ${lead.product}\nTelefone do cliente: ${lead.phone}\n\nAcesse o CRM e entre em contato!`;
      openWhatsApp(userPhone, msg);
    }

    // Mark as sent
    markAlertSent(lead.id, type === '12h' ? 'h12' : 'h18');
  }
}

export function getElapsedHours(lead: Lead): number {
  return Math.floor(getMsWithoutContact(lead) / (60 * 60 * 1000));
}
