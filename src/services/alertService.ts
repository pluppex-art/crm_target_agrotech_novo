import { Lead } from '../types/leads';
import { emailService } from './emailService';
import { useNotificationStore } from '../store/useNotificationStore';
import { useProductStore } from '../store/useProductStore';
import { useProfileStore } from '../store/useProfileStore';
import { financialCalculator } from './financialCalculator';
import { Task } from './taskService';
import { notifyLeadTransferred } from './leadNotificationService';

// Inactivity alert levels
const INACTIVITY_LEVELS = [
  { key: 'm3', ms: 3 * 60 * 1000, label: '3 minutos', isTransfer: false },
  { key: 'm15', ms: 15 * 60 * 1000, label: '15 minutos', isTransfer: false },
  { key: 'm30', ms: 30 * 60 * 1000, label: '30 minutos', isTransfer: false },
  { key: 'h1', ms: 1 * 60 * 60 * 1000, label: '1 hora', isTransfer: false },
  { key: 'h6', ms: 6 * 60 * 60 * 1000, label: '6 horas', isTransfer: false },
  { key: 'h12', ms: 12 * 60 * 60 * 1000, label: '12 horas', isTransfer: false },
  { key: 'h24', ms: 24 * 60 * 60 * 1000, label: '24 horas', isTransfer: false },
  { key: 'h36', ms: 36 * 60 * 60 * 1000, label: '36 horas', isTransfer: false },
  { key: 'h48', ms: 48 * 60 * 60 * 1000, label: '48 horas', isTransfer: true },
] as const;

type AlertKey = typeof INACTIVITY_LEVELS[number]['key'];

const SENT_ALERTS_KEY = 'crm_sent_alerts';

export function getSentAlerts(): Record<string, Partial<Record<AlertKey, boolean>>> {
  try {
    return JSON.parse(localStorage.getItem(SENT_ALERTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function markAlertSent(leadId: string, key: AlertKey) {
  const sent = getSentAlerts();
  sent[leadId] = { ...sent[leadId], [key]: true };
  localStorage.setItem(SENT_ALERTS_KEY, JSON.stringify(sent));
}

function clearAlertRecord(leadId: string) {
  const sent = getSentAlerts();
  delete sent[leadId];
  localStorage.setItem(SENT_ALERTS_KEY, JSON.stringify(sent));
}

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

export function openWhatsApp(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, '');
  const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

async function sendEmailAlert(userEmail: string, lead: Lead, label: string) {
  try {
    await emailService.sendEmail({
      to: userEmail,
      subject: `⚠️ Alerta CRM: Cliente "${lead.name}" sem contato há ${label}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Alerta de Inatividade</h2>
          <p>O cliente <strong>${lead.name}</strong> está sem contato há <strong>${label}</strong>.</p>
          <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding:8px; color:#6b7280;">Produto:</td><td style="padding:8px;"><strong>${(() => {
              const { products } = useProductStore.getState();
              return financialCalculator.findProduct(lead.product || '', products)?.name || lead.product;
            })()}</strong></td></tr>
            <tr><td style="padding:8px; color:#6b7280;">Telefone:</td><td style="padding:8px;"><strong>${lead.phone}</strong></td></tr>
            <tr><td style="padding:8px; color:#6b7280;">Responsável:</td><td style="padding:8px;"><strong>${(() => {
              const { profiles } = useProfileStore.getState();
              const profile = profiles.find(p => p.id === lead.responsavel_usuario_id || p.name === lead.responsible);
              return profile?.name || lead.responsible || 'Não definido';
            })()}</strong></td></tr>
          </table>
          <p style="color:#dc2626; font-weight:bold;">Acesse o CRM e entre em contato para não perder esta oportunidade!</p>
        </div>
      `,
    });
  } catch (err) {
    console.warn('Falha ao enviar e-mail de alerta:', err);
  }
}

export interface InactivityAlert {
  lead: Lead;
  label: string;
  key: AlertKey;
  isTransfer: boolean;
}

export interface InactivityCheckResult {
  alerts: InactivityAlert[];
  toTransfer: Lead[];
}

const INACTIVE_STAGE_KEYWORDS = ['ganho', 'aprovado', 'fechado', 'concluido', 'matriculado', 'confirmado', 'certificado', 'pos-venda', 'perdido', 'desqualificado'];

function isLeadInInactiveStage(lead: Lead): boolean {
  if (lead.status === 'closed') return true;
  const stageLower = (lead.status ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const subStatusLower = (lead.subStatus ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const isInactive = INACTIVE_STAGE_KEYWORDS.some(kw => stageLower.includes(kw)) ||
                     subStatusLower.includes('concluido') ||
                     subStatusLower.includes('ganho') ||
                     subStatusLower.includes('matriculado') ||
                     subStatusLower.includes('confirmado');
                     
  return isInactive;
}

export function checkLeadInactivity(
  leads: Lead[],
  autoTransferHours: number = 48,
  tasks: Task[] = [],
  enabledLevels?: string[]
): InactivityCheckResult {
  const autoTransferMs = autoTransferHours * 60 * 60 * 1000;
  const sentAlerts = getSentAlerts();
  const alerts: InactivityAlert[] = [];
  const toTransfer: Lead[] = [];

  // Filter to only enabled levels; always include h48 (transfer alert)
  const activeLevels = INACTIVITY_LEVELS.filter(
    l => l.isTransfer || !enabledLevels || enabledLevels.includes(l.key)
  );

  for (const lead of leads) {
    if (isLeadInInactiveStage(lead)) continue;

    const hasTasks = tasks.some(t => t.lead_id === lead.id);
    if (hasTasks) continue;

    const elapsed = getMsWithoutContact(lead);
    const leadSent = sentAlerts[lead.id] || {};

    // Find the highest active threshold reached that hasn't been sent yet
    for (let i = activeLevels.length - 1; i >= 0; i--) {
      const level = activeLevels[i];
      if (elapsed >= level.ms && !leadSent[level.key]) {
        alerts.push({ lead, label: level.label, key: level.key, isTransfer: level.isTransfer });
        break;
      }
    }

    // Flag for transfer separately (after alert check so h48 still fires)
    if (elapsed >= autoTransferMs) {
      toTransfer.push(lead);
    }
  }

  return { alerts, toTransfer };
}

export async function fireAlerts(
  alerts: InactivityAlert[],
  userEmail: string,
  userPhone?: string,
  targetUserId?: string
) {
  for (const alertItem of alerts) {
    const { lead, label, key, isTransfer } = alertItem;
    const { products } = useProductStore.getState();
    const { profiles } = useProfileStore.getState();
    const prodObj = financialCalculator.findProduct(lead.product || '', products);
    const prodName = prodObj?.name || lead.product || 'Não definido';
    const profile = profiles.find(p => p.id === lead.responsavel_usuario_id || p.name === lead.responsible);
    const respName = profile?.name || lead.responsible || 'Não definido';

    const title = isTransfer
      ? `🔄 ${lead.name} foi transferido para novo responsável`
      : `⚠️ ${lead.name} sem contato há ${label}`;
    const body = isTransfer
      ? `Lead sem contato há ${label}. Transferido para novo responsável.`
      : `Responsável: ${respName} | Produto: ${prodName}`;

    markAlertSent(lead.id, key);

    sendOSNotification(title, body);

    if (isTransfer) {
      const { profiles } = useProfileStore.getState();
      // Em caso de transferência automática, o targetUserId costuma ser o novo responsável
      const newResp = profiles.find(p => p.id === targetUserId);
      if (newResp) {
        await notifyLeadTransferred(lead, newResp.id, profiles);
      }
    } else {
      if (userEmail) {
        await sendEmailAlert(userEmail, lead, label);
      }

      useNotificationStore.getState().addNotification({
        title,
        message: body,
        type: 'urgent',
        category: 'system',
        link: `/pipeline?lead=${lead.id}`,
        meta: JSON.stringify({
          leadId: lead.id,
          phone: lead.phone,
          product: prodName,
          responsible: respName
        })
      }, targetUserId);
    }

    if (userPhone) {
      const msg = `⚠️ *Alerta CRM*\n\nO cliente *${lead.name}* está sem contato há *${label}*.\n\nProduto: ${prodName}\nTelefone do cliente: ${lead.phone}\n\nAcesse o CRM e entre em contato!`;
      openWhatsApp(userPhone, msg);
    }
  }
}

export function getElapsedHours(lead: Lead): number {
  return Math.floor(getMsWithoutContact(lead) / (60 * 60 * 1000));
}
