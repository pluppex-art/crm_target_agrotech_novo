import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables in the AI Studio Secrets panel.');
} else {
  console.log('Supabase initialized with URL:', supabaseUrl.substring(0, 20) + '...');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
export const serviceSupabase = supabaseServiceKey ? createClient(supabaseUrl || '', supabaseServiceKey) : null;

export function getServiceSupabaseClient(): SupabaseClient | null {
  return serviceSupabase;
}
