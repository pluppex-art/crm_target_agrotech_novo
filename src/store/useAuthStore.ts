import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any; debugLink?: string; message?: string; isSandbox?: boolean }>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  resetPassword: async (email: string) => {
    console.log('Iniciando recuperação de senha para:', email);
    
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar e-mail de recuperação.');
      }
      
      if (data.debugLink) {
        console.log('DEBUG: Link de recuperação gerado:', data.debugLink);
      }
      
      if (data.isSandbox) {
        console.warn('MailerSend em modo Sandbox: E-mail não enviado para este destinatário.');
        return { error: null, debugLink: data.debugLink, message: data.message, isSandbox: true };
      }
      
      console.log('E-mail de recuperação enviado com sucesso via MailerSend');
      return { error: null, debugLink: data.debugLink };
    } catch (err: any) {
      console.error('Erro na chamada de resetPassword:', err);
      return { error: err };
    }
  },

  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      set({ user: session?.user ?? null, loading: false, initialized: true });
    } catch (err: any) {
      console.error('Falha ao inicializar sessão Supabase:', err?.message ?? err);
      await supabase.auth.signOut();
      set({ user: null, loading: false, initialized: true });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, loading: false });
        return;
      }
      
      // Redirect to reset password if coming from recovery link
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Evento de recuperação de senha detectado, redirecionando...');
        window.location.href = '/reset-password';
      }

      set({ user: session?.user ?? null, loading: false });
    });
  },
}));
