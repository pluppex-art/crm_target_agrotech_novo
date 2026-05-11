import { create } from 'zustand';
import { Notification } from '../types/notifications';
import { supabase } from '../lib/supabase';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  fetchNotifications: () => Promise<void>;
  subscribe: () => () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>, userId?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id) // Strictly fetch for this user
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({
        notifications: (data || []) as unknown as Notification[],
        unreadCount: (data || []).filter(n => !n.read).length,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ isLoading: false });
    }
  },

  subscribe: () => {
    let cleanup = () => {};

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channelId = `notifications-${user.id}-${Math.random().toString(36).substring(7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newNotif = payload.new as Notification;
              set((state) => {
                const newNotifications = [newNotif, ...state.notifications];
                return {
                  notifications: newNotifications,
                  unreadCount: newNotifications.filter(n => !n.read).length
                };
              });
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Notification;
              set((state) => {
                const newNotifications = state.notifications.map(n =>
                  n.id === updated.id ? updated : n
                );
                return {
                  notifications: newNotifications,
                  unreadCount: newNotifications.filter(n => !n.read).length
                };
              });
            } else if (payload.eventType === 'DELETE') {
              set((state) => {
                const newNotifications = state.notifications.filter(n => n.id !== payload.old.id);
                return {
                  notifications: newNotifications,
                  unreadCount: newNotifications.filter(n => !n.read).length
                };
              });
            }
          }
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    });

    return () => cleanup();
  },

  addNotification: async (notif, userId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && !userId) return;

      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      const { error } = await supabase
        .from('notifications')
        .insert([{
          ...notif,
          user_id: targetUserId,
          read: false
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  },

  markAsRead: async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      
      // State update is handled by subscription, but we update locally for snappiness
      set((state) => {
        const newNotifications = state.notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        );
        return {
          notifications: newNotifications,
          unreadCount: newNotifications.filter(n => !n.read).length
        };
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      set((state) => {
        const newNotifications = state.notifications.map(n => ({ ...n, read: true }));
        return {
          notifications: newNotifications,
          unreadCount: 0
        };
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  removeNotification: async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => {
        const newNotifications = state.notifications.filter(n => n.id !== id);
        return {
          notifications: newNotifications,
          unreadCount: newNotifications.filter(n => !n.read).length
        };
      });
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  },

  clearAll: async () => {
    // Optimistic update first so UI responds instantly
    set({ notifications: [], unreadCount: 0 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete in batches to avoid timeout on large datasets
      while (true) {
        const { data } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .limit(500);

        if (!data || data.length === 0) break;

        await supabase
          .from('notifications')
          .delete()
          .in('id', data.map(n => n.id));
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}));
