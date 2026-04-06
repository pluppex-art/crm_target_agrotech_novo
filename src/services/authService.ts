import { getSupabaseClient } from '../lib/supabase';

const supabase = getSupabaseClient();

export async function enviarRecuperacao(email: string) {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Usamos window.location.origin para garantir que o link volte para o seu app atual
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
}

export async function trocarSenha(novaSenha: string) {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { error } = await supabase.auth.updateUser({
    password: novaSenha,
  });

  if (error) throw error;
}

export async function definirNovaSenha(novaSenha: string) {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { error } = await supabase.auth.updateUser({
    password: novaSenha,
  });

  if (error) throw error;
}
