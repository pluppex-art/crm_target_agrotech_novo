import { useProductStore } from '../store/useProductStore';
import { financialCalculator } from './financialCalculator';
import type { Lead } from '../types/leads';
import type { UserProfile } from './profileService';
import type { Task } from './taskService';
import { supabase } from '@/lib/supabase';
import { emailService } from './emailService';
import { emailTemplates } from './emailTemplates';

function findProfile(idOrName: string, profiles: UserProfile[]): UserProfile | undefined {
  if (!idOrName) return undefined;
  const lower = idOrName.toLowerCase();
  return profiles.find(p => p.id === idOrName || p.name?.toLowerCase() === lower);
}

function findAdminProfiles(profiles: UserProfile[]): UserProfile[] {
  return profiles.filter(p =>
    p.status === 'active' &&
    (p.cargos?.permissions?.includes('admin.all') ||
      p.cargos?.name?.toLowerCase().includes('coordenador') ||
      p.cargos?.name?.toLowerCase().includes('admin'))
  );
}

export async function insertNotificationForUser(
  userId: string,
  notification: {
    title: string;
    message: string;
    type: string;
    category: string;
    link?: string;
  }
): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('title', notification.title)
    .gte('created_at', since)
    .limit(1);
  if (existing && existing.length > 0) return;

  const { error } = await supabase.from('notifications').insert([{
    user_id: userId,
    read: false,
    ...notification,
  }]);
  if (error) console.warn('Erro ao inserir notificação:', error);
}

export async function notifyNewLead(lead: Lead, profiles: UserProfile[]): Promise<void> {
  const responsible = findProfile(lead.responsavel_usuario_id || lead.responsible || '', profiles);
  if (!responsible) return;

  const { products } = useProductStore.getState();
  const prodObj = financialCalculator.findProduct(lead.product || '', products);
  const prodName = prodObj?.name || lead.product || 'N/A';

  await insertNotificationForUser(responsible.id, {
    title: `Novo lead: ${lead.name}`,
    message: `Você recebeu um novo lead. Produto: ${prodName}. Telefone: ${lead.phone}`,
    type: 'info',
    category: 'user',
    link: `/pipeline?lead=${lead.id}`,
  });

  if (responsible.email) {
    try {
      await emailService.sendEmail({
        to: responsible.email,
        subject: `🔔 Novo Lead: ${lead.name}`,
        html: emailTemplates.newLeadResponsible(responsible.name || '', lead.name, prodName, lead.lead_source || 'Cadastro Manual', lead.phone, lead.email ?? undefined)
      });
    } catch (err) {
      console.warn('[Notification] Falha ao enviar e-mail de novo lead:', err);
    }
  }
}

export async function notifyLeadTransferred(
  lead: Lead,
  newResponsibleName: string,
  profiles: UserProfile[]
): Promise<void> {
  const newResponsible = findProfile(newResponsibleName, profiles);
  const { products } = useProductStore.getState();
  const prodObj = financialCalculator.findProduct(lead.product || '', products);
  const prodName = prodObj?.name || lead.product || 'N/A';

  if (newResponsible) {
    await insertNotificationForUser(newResponsible.id, {
      title: `Lead transferido para você: ${lead.name}`,
      message: `O lead ficou 48h sem contato e foi transferido. Produto: ${prodName} | Tel: ${lead.phone}`,
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

  if (newResponsible && newResponsible.email) {
    try {
      await emailService.sendEmail({
        to: newResponsible.email,
        subject: `🔄 Lead Transferido (Inatividade): ${lead.name}`,
        html: emailTemplates.leadTransfer48h(newResponsible.name || '', lead.name, lead.responsible || 'Vendedor Anterior', prodName, lead.phone, lead.email ?? undefined)
      });
    } catch (err) {
      console.warn('[Notification] Falha ao enviar e-mail de transferência automática:', err);
    }
  }
}

export async function notifyLeadManualTransfer(
  lead: Lead,
  fromResponsibleName: string,
  toResponsibleName: string,
  profiles: UserProfile[]
): Promise<void> {
  const toResponsible = findProfile(toResponsibleName, profiles);
  if (!toResponsible) return;

  const { products } = useProductStore.getState();
  const prodObj = financialCalculator.findProduct(lead.product || '', products);
  const prodName = prodObj?.name || lead.product || 'N/A';

  await insertNotificationForUser(toResponsible.id, {
    title: `Lead transferido para você: ${lead.name}`,
    message: `${fromResponsibleName} transferiu o lead ${lead.name} para você. Produto: ${prodName}`,
    type: 'info',
    category: 'user',
    link: `/pipeline?lead=${lead.id}`,
  });

  if (toResponsible.email) {
    try {
      await emailService.sendEmail({
        to: toResponsible.email,
        subject: `📨 Lead Transferido: ${lead.name}`,
        html: emailTemplates.leadTransferManual(
          toResponsible.name || '',
          fromResponsibleName,
          lead.name,
          prodName,
          lead.phone,
          lead.email ?? undefined
        )
      });
    } catch (err) {
      console.warn('[Notification] Falha ao enviar e-mail de transferência manual:', err);
    }
  }
}

export async function notifyLeadAssignment(
  lead: Lead,
  newResponsibleName: string,
  profiles: UserProfile[]
): Promise<void> {
  const responsible = findProfile(newResponsibleName, profiles);
  if (!responsible) return;

  const { products } = useProductStore.getState();
  const prodObj = financialCalculator.findProduct(lead.product || '', products);
  const prodName = prodObj?.name || lead.product || 'N/A';

  await insertNotificationForUser(responsible.id, {
    title: `Lead atribuído a você: ${lead.name}`,
    message: `Você é o novo responsável por ${lead.name}. Produto: ${prodName}`,
    type: 'info',
    category: 'user',
    link: `/pipeline?lead=${lead.id}`,
  });

  if (responsible.email) {
    try {
      await emailService.sendEmail({
        to: responsible.email,
        subject: `🚀 Novo Lead Atribuído: ${lead.name}`,
        html: emailTemplates.leadAssignment(responsible.name || '', lead.name, prodName, lead.phone, lead.email ?? undefined)
      });
    } catch (err) {
      console.warn('[Notification] Falha ao enviar e-mail de atribuição:', err);
    }
  }
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

  const { products } = useProductStore.getState();
  const prodObj = financialCalculator.findProduct(lead.product || '', products);
  const prodName = prodObj?.name || lead.product || 'N/A';
  const respProfile = findProfile(lead.responsavel_usuario_id || lead.responsible || '', profiles);
  const respName = respProfile?.name || lead.responsible || 'N/A';

  const type = resolveStageType(stageLower);
  const admins = findAdminProfiles(profiles);
  for (const admin of admins) {
    await insertNotificationForUser(admin.id, {
      title: `Lead em "${stageName}": ${lead.name}`,
      message: `Responsável: ${respName} | Produto: ${prodName} | Tel: ${lead.phone}`,
      type,
      category: 'system',
      link: `/pipeline?lead=${lead.id}`,
    });
  }
}

export async function notifyNewTask(task: Task, creatorId: string): Promise<void> {
  if (!task.responsavel_usuario_id || task.responsavel_usuario_id === creatorId) return;

  await insertNotificationForUser(task.responsavel_usuario_id, {
    title: `Nova tarefa: ${task.title}`,
    message: `Você recebeu uma nova tarefa. Prazo: ${task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}${task.lead_name ? ` | Lead: ${task.lead_name}` : ''}`,
    type: 'info',
    category: 'user',
    link: `/tasks?id=${task.id}`,
  });

  // Get user profile to send email
  const { data: profile } = await supabase
    .from('perfis')
    .select('email, name')
    .eq('id', task.responsavel_usuario_id)
    .single();

  if (profile?.email) {
    let leadPhone: string | undefined;
    if (task.lead_id) {
      const { data: leadData } = await supabase.from('leads').select('phone').eq('id', task.lead_id).single();
      leadPhone = leadData?.phone;
    }
    try {
      await emailService.sendEmail({
        to: profile.email,
        subject: `📋 Nova Tarefa Atribuída: ${task.title}`,
        html: emailTemplates.taskAssignment(
          profile.name || '',
          task.title,
          task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data',
          task.lead_name,
          leadPhone
        )
      });
    } catch (err) {
      console.warn('[Notification] Falha ao enviar e-mail de nova tarefa:', err);
    }
  }
}

export async function notifyTaskReminder(task: Task): Promise<void> {
  if (!task.responsavel_usuario_id || task.status === 'completed') return;

  await insertNotificationForUser(task.responsavel_usuario_id, {
    title: `Lembrete: ${task.title}`,
    message: `Tarefa pendente para hoje ou atrasada. Prazo: ${task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}`,
    type: 'urgent',
    category: 'alerts',
    link: `/tasks?id=${task.id}`,
  });

  // Get user profile to send email reminder
  const { data: profile } = await supabase
    .from('perfis')
    .select('email, name')
    .eq('id', task.responsavel_usuario_id)
    .single();

  if (profile?.email) {
    let leadPhone: string | undefined;
    if (task.lead_id) {
      const { data: leadData } = await supabase.from('leads').select('phone').eq('id', task.lead_id).single();
      leadPhone = leadData?.phone;
    }
    try {
      await emailService.sendEmail({
        to: profile.email,
        subject: `⏰ Lembrete de Tarefa: ${task.title}`,
        html: emailTemplates.taskAssignment(
          profile.name || '',
          `LEMBRETE: ${task.title}`,
          task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data',
          task.lead_name,
          leadPhone
        )
      });
    } catch (err) {
      console.warn('[Notification] Falha ao enviar e-mail de lembrete de tarefa:', err);
    }
  }
}
