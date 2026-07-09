import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

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
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Retorna o client Supabase singleton.
 * Mantido para compatibilidade com código legado que chama getSupabaseClient().
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  return supabase;
}

// ATENÇÃO:
// Evitar criar client com service role key no browser.
// Isso pode causar múltiplas instâncias do auth (GoTrue) e gerar comportamentos inesperados.
//
// Operações admin devem ser feitas via endpoints do server (ex.: /api/create-user, /api/update-user etc).

export function getServiceSupabaseClient(): SupabaseClient<Database> {
  throw new Error('getServiceSupabaseClient() não deve ser usado no browser. Use endpoints /api server-side.');
}

