import { getSupabaseClient } from '../lib/supabase';

export const settingsService = {
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const supabase = getSupabaseClient();
    if (!supabase) return defaultValue;

    const { data, error } = await supabase
      .from('crm_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !data) return defaultValue;
    return data.value as T;
  },

  async updateSetting(key: string, value: any): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('crm_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) {
      console.error('Error updating setting:', error);
      return false;
    }

    return true;
  }
};
