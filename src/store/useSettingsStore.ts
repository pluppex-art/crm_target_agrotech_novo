import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface NotificationPrefs {
  newLead: boolean;
  leadInactive: boolean;
  leadAssigned: boolean;
  stageChange: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  newLead: true,
  leadInactive: true,
  leadAssigned: true,
  stageChange: true,
};

interface SettingsState {
  autoTransferHours: number;
  notificationPrefs: NotificationPrefs;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<void>;
  updateNotificationPrefs: (prefs: NotificationPrefs) => Promise<void>;
  subscribe: () => () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  autoTransferHours: 48,
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  isLoading: false,

  subscribe: () => {
    const channelId = `settings-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_settings' },
        (payload) => {
          const { key, value } = payload.new as any;
          if (key === 'lead_transfer_timeout_hours') {
            set({ autoTransferHours: Number(value) });
          }
          if (key === 'notification_preferences') {
            set({ notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(value as object) } });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.from('crm_settings').select('key, value');
      if (error) throw error;

      const settings: Record<string, any> = {};
      data?.forEach(s => { settings[s.key] = s.value; });

      set({
        autoTransferHours: Number(settings['lead_transfer_timeout_hours'] || 48),
        notificationPrefs: {
          ...DEFAULT_NOTIFICATION_PREFS,
          ...(settings['notification_preferences'] || {}),
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    try {
      const { error } = await supabase
        .from('crm_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;

      if (key === 'lead_transfer_timeout_hours') {
        set({ autoTransferHours: Number(value) });
      }
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  },

  updateNotificationPrefs: async (prefs) => {
    try {
      const { error } = await supabase
        .from('crm_settings')
        .upsert({ key: 'notification_preferences', value: prefs, updated_at: new Date().toISOString() });
      if (error) throw error;
      set({ notificationPrefs: prefs });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  },
}));
