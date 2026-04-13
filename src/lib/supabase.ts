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

/**
 * Alias de getSupabaseClient para compatibilidade com imports de cargosService.
 * NOTA: no frontend só temos acesso à anon key — não existe client com service role.
 * Operações que exigem service role devem ser feitas via Edge Functions no backend.
 */
export function getServiceSupabaseClient(): SupabaseClient {
  return supabase;
}
