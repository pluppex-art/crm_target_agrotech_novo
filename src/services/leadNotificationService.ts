import { supabase } from '../lib/supabase';
import type { Lead } from '../types/leads';
import type { UserProfile } from './profileService';

function findProfileByName(name: string, profiles: UserProfile[]): UserProfile | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return profiles.find(p => p.name?.toLowerCase() === lower);
}

function findAdminProfiles(profiles: UserProfile[]): UserProfile[] {
  return profiles.filter(p =>
    p.status === 'active' &&
    (p.cargos?.permissions?.includes('admin.all') ||
      p.cargos?.name?.toLowerCase().includes('coordenador') ||
      p.cargos?.name?.toLowerCase().includes('admin'))
  );
}

async function insertNotificationForUser(
  userId: string,
  notification: {
    title: string;
    message: string;
    type: string;
    category: string;
    link?: string;
  }
): Promise<void> {
  const { error } = await supabase.from('notifications').insert([{
    user_id: userId,
    read: false,
    ...notification,
  }]);
  if (error) console.warn('Erro ao inserir notificação:', error);
}

export async function notifyNewLead(lead: Lead, profiles: UserProfile[]): Promise<void> {
  const responsible = findProfileByName(lead.responsible || '', profiles);
  if (!responsible) return;

  await insertNotificationForUser(responsible.id, {
    title: `Novo lead: ${lead.name}`,
    message: `Você recebeu um novo lead. Produto: ${lead.product || 'N/A'}. Telefone: ${lead.phone}`,
    type: 'info',
    category: 'user',
    link: `/pipeline?lead=${lead.id}`,
  });
}

export async function notifyLeadTransferred(
  lead: Lead,
  newResponsibleName: string,
  profiles: UserProfile[]
): Promise<void> {
  const newResponsible = findProfileByName(newResponsibleName, profiles);
  if (newResponsible) {
    await insertNotificationForUser(newResponsible.id, {
      title: `Lead transferido para você: ${lead.name}`,
      message: `O lead ficou 48h sem contato e foi transferido. Produto: ${lead.product || 'N/A'} | Tel: ${lead.phone}`,
      type: 'urgent',
      category: 'user',
      link: `/pipeline?lead=${lead.id}`,
    });
  }

  const admins = findAdminProfiles(profiles);
  for (const admin of admins) {
    await insertNotificationForUser(admin.id, {
      title: `Lead transferido: ${lead.name}`,
      message: `Inativo por 48h. Transferido de ${lead.responsible || 'N/A'} para ${newResponsibleName}. Produto: ${lead.product || 'N/A'}`,
      type: 'urgent',
      category: 'system',
      link: `/pipeline?lead=${lead.id}`,
    });
  }
}

export async function notifyLeadAssignment(
  lead: Lead,
  newResponsibleName: string,
  profiles: UserProfile[]
): Promise<void> {
  const responsible = findProfileByName(newResponsibleName, profiles);
  if (!responsible) return;

  await insertNotificationForUser(responsible.id, {
    title: `Lead atribuído a você: ${lead.name}`,
    message: `Você é o novo responsável por ${lead.name}. Produto: ${lead.product || 'N/A'}`,
    type: 'info',
    category: 'user',
    link: `/pipeline?lead=${lead.id}`,
  });
}

const COORDINATOR_NOTIFY_KEYWORDS = ['contrato', 'ganho', 'fechado', 'aprovado', 'perdido'];

function resolveStageType(stageLower: string): 'success' | 'urgent' | 'info' {
  if (stageLower.includes('ganho') || stageLower.includes('aprovado') || stageLower.includes('fechado')) return 'success';
  if (stageLower.includes('perdido')) return 'urgent';
  return 'info';
}

export async function notifyStageChange(
  lead: Lead,
  stageName: string,
  profiles: UserProfile[]
): Promise<void> {
  const stageLower = stageName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const shouldNotify = COORDINATOR_NOTIFY_KEYWORDS.some(kw => stageLower.includes(kw));
  if (!shouldNotify) return;

  const type = resolveStageType(stageLower);
  const admins = findAdminProfiles(profiles);
  for (const admin of admins) {
    await insertNotificationForUser(admin.id, {
      title: `Lead em "${stageName}": ${lead.name}`,
      message: `Responsável: ${lead.responsible || 'N/A'} | Produto: ${lead.product || 'N/A'} | Tel: ${lead.phone}`,
      type,
      category: 'system',
      link: `/pipeline?lead=${lead.id}`,
    });
  }
}
