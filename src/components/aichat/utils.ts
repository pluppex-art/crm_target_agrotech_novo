import type { Message } from './types';
import { CHAT_COLORS, WAHA_API, WAHA_API_KEY } from './constants';

export function normalizeChatId(id: string): string {
  if (!id) return id;
  // Strip multi-device suffix like ":3@" → "5511999@s.whatsapp.net" before replacing domain
  return id
    .replace(/:\d+@/, '@')
    .replace(/@s\.whatsapp\.net$/, '@c.us')
    .replace(/@lid$/, '@c.us');
}

export function extractChatId(msg: any): string {
  const remoteJid: string = msg.key?.remoteJid ?? '';
  if (remoteJid) return normalizeChatId(remoteJid);
  return normalizeChatId(msg.fromMe ? (msg.to ?? '') : (msg.from ?? ''));
}

export function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString('pt-BR', { weekday: 'short' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export async function wahaFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${WAHA_API}${path}`, {
    ...options,
    headers: { 'X-Api-Key': WAHA_API_KEY, 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WAHA ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function mapMessage(m: any): Message {
  const msgId = typeof m.id === 'object' ? (m.id._serialized ?? JSON.stringify(m.id)) : String(m.id ?? Date.now());
  return {
    id: msgId,
    sender: m.fromMe ? 'me' : 'contact',
    content: m.body || (m.hasMedia ? `[${m.type ?? 'Mídia'}]` : '(sem conteúdo)'),
    timestamp: m.timestamp ? fmtTime(m.timestamp) : '',
    ack: m.fromMe ? (m.ack ?? 1) : undefined,
  };
}

export function colorForId(id: string): string {
  let h = 0;
  for (const c of id) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return CHAT_COLORS[Math.abs(h) % CHAT_COLORS.length];
}

export function getInitials(name: string): string {
  return (name || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
}

export function formatPhone(waId: string): string {
  const num = waId.split('@')[0];
  if (/^55\d{11}$/.test(num)) return `+55 ${num.slice(2, 4)} ${num.slice(4, 9)}-${num.slice(9)}`;
  return `+${num}`;
}
