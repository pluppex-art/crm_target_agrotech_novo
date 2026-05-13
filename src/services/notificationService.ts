import { supabase } from '../lib/supabase';
import { Notification, NotificationType } from '../types/notifications';

export const notificationService = {
  async addNotification(notification: Omit<Notification, 'id' | 'read' | 'created_at'>, userId?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    // Anti-loop/duplicate check: don't insert same title for same user in last 12 hours
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('title', notification.title)
      .gte('created_at', since)
      .limit(1);

    if (existing && existing.length > 0) return;

    const { error } = await supabase
      .from('notifications')
      .insert([{
        ...notification,
        user_id: targetUserId,
        read: false,
      }]);

    if (error) console.error('Notification error:', error);
  },

  async sendSuccess(message: string, title = 'Sucesso', link?: string) {
    await this.addNotification({
      title,
      message,
      type: 'success',
      category: 'system',
      link,
    });
  },

  async sendProfileCargoUpdate(cargoName: string, userName: string) {
    await this.sendSuccess(
      `Cargo atualizado para "${cargoName}"`,
      `${userName} - Cargo Alterado`,
      '/settings/profile'
    );
  },
};
