import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Debug temporário — remover após confirmar que as variáveis chegam na Vercel
console.log('[supabase] VITE_SUPABASE_URL definida:', !!supabaseUrl);
console.log('[supabase] VITE_SUPABASE_ANON_KEY definida:', !!supabaseAnonKey);

if (!supabaseUrl) {
  throw new Error(
    'VITE_SUPABASE_URL não foi definida. ' +
    'Verifique as variáveis de ambiente no painel da Vercel.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY não foi definida. ' +
    'Verifique as variáveis de ambiente no painel da Vercel.'
  );
}

/** Client singleton compartilhado por toda a aplicação. */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Retorna o client Supabase singleton.
 * Mantido para compatibilidade com código legado que chama getSupabaseClient().
 */
export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

/** Client com service role key para operações admin (createUser, deleteUser). */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey ?? supabaseAnonKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export function getServiceSupabaseClient(): SupabaseClient {
  return supabaseAdmin;
}
