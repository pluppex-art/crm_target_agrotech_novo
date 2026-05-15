import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface NotificationPrefs {
  newLead: boolean;
  leadInactive: boolean;
  leadAssigned: boolean;
  stageChange: boolean;
  newTask: boolean;
  taskDue: boolean;
  enableSound: boolean;
  inactivityLevels: string[];
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  newLead: true,
  leadInactive: true,
  leadAssigned: true,
  stageChange: true,
  newTask: true,
  taskDue: true,
  enableSound: true,
  inactivityLevels: ['h1', 'h6', 'h24', 'h48'],
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
    const { error } = await supabase
      .from('crm_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;

    if (key === 'lead_transfer_timeout_hours') {
      set({ autoTransferHours: Number(value) });
    }
  },

  updateNotificationPrefs: async (prefs) => {
    const { error } = await supabase
      .from('crm_settings')
      .upsert({ key: 'notification_preferences', value: prefs as unknown as any }, { onConflict: 'key' });
    if (error) throw error;
    set({ notificationPrefs: prefs });
  },
}));
