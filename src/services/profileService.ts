import { getSupabaseClient } from '../lib/supabase';

export interface CreateProfilePayload {
  name?: string;
  email: string;
  phone?: string;
  role_id?: string;
  department: string;
  status: 'active' | 'inactive';
  cpf: string;
  avatar_url?: string;
  password?: string;
}

export interface UserProfile extends CreateProfilePayload {
  [x: string]: any;
  id: string;
  role_id?: string;
  cargos?: {
    name?: string;
    permissions: string[];
  } | null;
}

export const profileService = {
  async getProfiles(): Promise<UserProfile[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('perfis')
      .select('*, cargos:role_id(*)');

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
      .select('*, cargos:role_id(*)')
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

    const originalEmail = profile.email;
    // Remove email and joined/computed fields that don't exist as columns in perfis
    const { email, role_id, cargos, cargo_name, ...updateData } = profile as any;
    const finalUpdateData = { id, ...updateData, role_id: role_id || null };

    // Update perfis
    const { data, error: perfisError } = await supabase
      .from('perfis')
      .upsert(finalUpdateData)
      .select()
      .single();

    if (perfisError) {
      console.error('Error updating perfis:', perfisError);
      return { data: null, error: perfisError };
    }

    // Update auth user email via backend (service role required)
    if (originalEmail && data) {
      const resp = await fetch('/api/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email: originalEmail }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.warn('Auth email update failed (perfis updated anyway):', err);
      }
    }

    return { data, error: null };
  },

  async createProfile(profile: CreateProfilePayload): Promise<{ data: UserProfile | null; error: any }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase client not initialized' };

    // Create auth user via backend (service role required)
    let userId: string = crypto.randomUUID();

    if (profile.email) {
      const resp = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, password: profile.password, name: profile.name }),
      });
      const result = await resp.json();
      if (!resp.ok) {
        console.error('Auth user creation failed:', result.error);
        return { data: null, error: result.error };
      }
      if (result.id) {
        userId = result.id;
      }
    }
    
    const insertData: UserProfile = {
      id: userId,
      ...profile,
      must_change_password: true,
    };
    delete (insertData as any).password;

    const { data, error } = await supabase
      .from('perfis')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return { data: null, error };
    }

    return { data, error: null };
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
