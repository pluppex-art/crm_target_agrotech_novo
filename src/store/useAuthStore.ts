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
    // Register listener FIRST so PASSWORD_RECOVERY is never missed
    supabase.auth.onAuthStateChange((event: any, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, loading: false, initialized: true });
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        if (window.location.pathname !== '/reset-password') {
          window.location.href = '/reset-password';
          return;
        }
        set({ user: session?.user ?? null, loading: false, initialized: true });
        return;
      }

      set({ user: session?.user ?? null, loading: false, initialized: true });
    });

    // Fallback: bootstrap initialized state if INITIAL_SESSION doesn't fire
    // (can happen when there is no stored session and no URL hash/code)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set((state) => state.initialized ? state : { user: session?.user ?? null, loading: false, initialized: true });
    } catch {
      set((state) => state.initialized ? state : { user: null, loading: false, initialized: true });
    }
  },
}));
