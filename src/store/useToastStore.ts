import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'urgent';

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  link?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (toast) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration ?? 6000;

    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
