import { getSupabaseClient, getServiceSupabaseClient } from '../lib/supabase';

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
    name: any;
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

    const { email, password, role_id, ...updateData } = profile;
    const finalUpdateData = { id, ...updateData, role_id: role_id || null };

    // Update perfis table
    const { data, error: perfisError } = await supabase
      .from('perfis')
      .upsert(finalUpdateData)
      .select()
      .single();

    if (perfisError) {
      console.error('Error updating perfis:', perfisError);
      return { data: null, error: perfisError };
    }

    // Update auth user email/password via API
    if (email || password) {
      try {
        const resp = await fetch('/api/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, email, password }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          console.warn('Auth update via API failed:', err);
        }
      } catch (err) {
        console.warn('Auth update via API failed (network):', err);
      }
    }

    return { data, error: null };
  },

  async createProfile(profile: CreateProfilePayload): Promise<{ data: UserProfile | null; error: any }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase client not initialized' };

    let userId: string;

    // Create auth user via API
    try {
      const resp = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          password: profile.password,
          name: profile.name,
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Erro ao criar usuário auth.');
      userId = result.id;
    } catch (err: any) {
      console.error('Auth creation via API failed:', err.message);
      return { data: null, error: err.message };
    }

    const { password, ...insertData } = profile;
    const finalInsertData = {
      id: userId,
      ...insertData
    };

    const { data, error } = await supabase
      .from('perfis')
      .insert([finalInsertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile record:', error);
      // Optional: cleanup auth user if profile record fails?
      return { data: null, error };
    }

    return { data, error: null };
  },

  async deleteProfile(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // Delete auth user via API
    try {
      await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.warn('Auth deletion via API failed:', err);
    }

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
