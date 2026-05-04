import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  read: boolean;
  category: 'system' | 'user' | 'alerts';
  created_at: string;
  link?: string;
  meta?: string;
}

export const notificationService = {
  async addNotification(notification: Omit<Notification, 'id' | 'read' | 'created_at'>, userId?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

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

