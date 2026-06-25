import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface SLARule {
  enabled: boolean;
  maxHours: number;
  preAlertHours: number;
  effect: string;
  theme: string;
  icon: string;
}

export interface SLAConfig {
  alta: SLARule;
  media: SLARule;
  baixa: SLARule;
  exceptions: {
    ignoreWithTasks: boolean;
    ignoreGanho: boolean;
    ignoreAquecimento: boolean;
  };
}

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  alta:  { enabled: true,  maxHours: 24, preAlertHours: 4,  effect: 'pulse-red',   theme: 'vermelho', icon: 'fogo'    },
  media: { enabled: true,  maxHours: 48, preAlertHours: 8,  effect: 'pulse-amber', theme: 'laranja',  icon: 'relogio' },
  baixa: { enabled: false, maxHours: 72, preAlertHours: 12, effect: 'pulse-blue',  theme: 'azul',     icon: 'info'    },
  exceptions: { ignoreWithTasks: true, ignoreGanho: true, ignoreAquecimento: true },
};

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
  slaConfig: SLAConfig;
  notificationPrefs: NotificationPrefs;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<void>;
  updateNotificationPrefs: (prefs: NotificationPrefs) => Promise<void>;
  subscribe: () => () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  autoTransferHours: 48,
  slaConfig: DEFAULT_SLA_CONFIG,
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
          if (key === 'sla_config') {
            set({ slaConfig: { ...DEFAULT_SLA_CONFIG, ...(value as SLAConfig) } });
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
        slaConfig: settings['sla_config']
          ? { ...DEFAULT_SLA_CONFIG, ...(settings['sla_config'] as SLAConfig) }
          : DEFAULT_SLA_CONFIG,
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
