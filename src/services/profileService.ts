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
    name: any;
    permissions: string[];
  } | null;
}

/** Normalise raw DB row so that cargos.permissions is always string[] and status is narrowed. */
function normaliseProfile(raw: any): UserProfile {
  if (!raw) return raw;
  return {
    ...raw,
    status: (raw.status as 'active' | 'inactive') ?? 'active',
    cargos: raw.cargos
      ? { ...raw.cargos, permissions: (raw.cargos.permissions as unknown as string[]) || [] }
      : raw.cargos,
  };
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

    return (data || []).map(normaliseProfile);
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

    return normaliseProfile(data);
  },

  async updateProfile(id: string, profile: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: any }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { data: null, error: 'Supabase client not initialized' };

    const { password, role_id, email, ...updateData } = profile;
    const finalUpdateData = { id, ...updateData, role_id: role_id || null, ...(email ? { email } : {}) };

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

    // Update auth user email/password via API (with timeout to prevent modal hanging)
    if (email || password) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch('/api/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, email, password }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!resp.ok) {
          const err = await resp.json();
          console.warn('Auth update via API failed:', err);
        }
      } catch (err) {
        console.warn('Auth update via API failed (network/timeout):', err);
      }
    }

    return { data: normaliseProfile(data), error: null };
  },

  async createProfile(profile: CreateProfilePayload): Promise<{ data: UserProfile | null; error: any }> {
    const supabase = getSupabaseClient();

    // Step 1: Create auth user via server API (uses SUPABASE_SERVICE_ROLE_KEY securely on the server)
    let userId: string;
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

      if (!resp.ok) {
        console.error('[createProfile] Auth API error:', result);
        return { data: null, error: result.error || 'Erro ao criar usuário na autenticação.' };
      }

      if (!result.id) {
        return { data: null, error: 'Servidor não retornou o ID do usuário.' };
      }

      userId = result.id;
    } catch (err: any) {
      console.error('[createProfile] Network error calling /api/create-user:', err);
      return { data: null, error: 'Erro de rede ao criar usuário. Verifique se o servidor está rodando.' };
    }

    // Step 2: Upsert profile record (trigger may have already inserted a minimal row)
    const { password, ...rawInsert } = profile;
    // Convert empty strings to null so optional fields don't violate constraints
    const insertData = Object.fromEntries(
      Object.entries(rawInsert).map(([k, v]) => [k, v === '' ? null : v])
    );
    const { data, error } = await supabase
      .from('perfis')
      .upsert({ id: userId, ...insertData })
      .select()
      .single();

    if (error) {
      console.error('[createProfile] Error inserting perfis record:', error);
      return { data: null, error: error.message || 'Erro ao salvar perfil no banco de dados.' };
    }

    return { data: normaliseProfile(data), error: null };
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
