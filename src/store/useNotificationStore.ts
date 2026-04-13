import { create } from 'zustand';
import { Notification } from '../types/notifications';
import { supabase } from '../lib/supabase';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  fetchNotifications: () => Promise<void>;
  subscribe: () => () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => Promise<void>;
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
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ 
        notifications: data || [], 
        unreadCount: (data || []).filter(n => !n.read).length,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ isLoading: false });
    }
  },

  subscribe: () => {
    const channelId = `notifications-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Only process if it belongs to this user or is system-wide
          const newNotif = payload.new as Notification;
          if (newNotif.user_id && newNotif.user_id !== user.id) return;

          if (payload.eventType === 'INSERT') {
            set((state) => {
              const newNotifications = [newNotif, ...state.notifications];
              return {
                notifications: newNotifications,
                unreadCount: newNotifications.filter(n => !n.read).length
              };
            });
          } else if (payload.eventType === 'UPDATE') {
            set((state) => {
              const newNotifications = state.notifications.map(n => 
                n.id === newNotif.id ? newNotif : n
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

    return () => {
      supabase.removeChannel(channel);
    };
  },

  addNotification: async (notif) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .insert([{
          ...notif,
          user_id: user.id,
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      set({ notifications: [], unreadCount: 0 });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}));
