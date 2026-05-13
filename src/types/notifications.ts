export type NotificationType = 'urgent' | 'pending' | 'info' | 'success' | 'system';

export interface Notification {
  id: string;
  created_at: string;
  user_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  category: 'user' | 'system' | 'alerts';
  meta?: string;
}
