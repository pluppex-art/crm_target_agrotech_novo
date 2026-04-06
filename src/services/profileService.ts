import { getSupabaseClient } from '../lib/supabase';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  cpf: string;
  avatar_url?: string;
}

export const profileService = {
  async getProfiles(): Promise<UserProfile[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('perfis')
      .select('*');

    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }

    return data || [];
  },

  async getProfile(id: string): Promise<UserProfile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  async updateProfile(id: string, profile: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: any }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase client not initialized' };

    // Remove email from profile update as it's usually managed by Auth
    const { email, ...updateData } = profile;

    const { data, error } = await supabase
      .from('perfis')
      .upsert({ id, ...updateData })
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  async createProfile(profile: UserProfile): Promise<UserProfile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('perfis')
      .insert([profile])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    return data;
  },

  async deleteProfile(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('perfis')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting profile:', error);
      return false;
    }

    return true;
  }
};
