import { create } from 'zustand';
import { turmaService, Turma, TurmaAttendee, AttendanceStatus } from '../services/turmaService';
import { getSupabaseClient } from '../lib/supabase';

export type { Turma, TurmaAttendee, AttendanceStatus };

interface TurmaState {
  turmas: Turma[];
  isLoading: boolean;
  setupRequired: boolean;
  fetchTurmas: () => Promise<void>;
  addTurma: (turma: Omit<Turma, 'id' | 'attendees' | 'product_name' | 'category'>) => Promise<void>;
  updateTurma: (turmaId: string, turma: Partial<Omit<Turma, 'id' | 'attendees' | 'product_name' | 'category'>>) => Promise<void>;
  removeTurma: (turmaId: string) => Promise<void>;
  updateAttendeeStatus: (turmaId: string, attendeeId: string, status: AttendanceStatus) => Promise<void>;
  addAttendee: (turmaId: string, attendee: Omit<TurmaAttendee, 'id'>) => Promise<TurmaAttendee | null>;
  removeAttendee: (turmaId: string, attendeeId: string) => Promise<void>;
  subscribe: () => () => void;
}

export const useTurmaStore = create<TurmaState>((set, get) => ({
  turmas: [],
  isLoading: false,
  setupRequired: false,

  fetchTurmas: async () => {
    set({ isLoading: true, setupRequired: false });
    try {
      const turmas = await turmaService.getAll();
      set({ turmas, isLoading: false });
    } catch (err: any) {
      if (err.message === 'SETUP_REQUIRED') {
        set({ setupRequired: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },

  addTurma: async (turmaData) => {
    const newTurma = await turmaService.create(turmaData);
    if (newTurma) {
      set((state) => ({ turmas: [newTurma, ...state.turmas] }));
    }
  },

  updateTurma: async (turmaId, turmaData) => {
    const ok = await turmaService.update(turmaId, turmaData);
    if (ok) {
      set((state) => ({
        turmas: state.turmas.map((t) =>
          t.id === turmaId ? { ...t, ...turmaData } : t
        ),
      }));
    }
  },

  removeTurma: async (turmaId) => {
    const ok = await turmaService.remove(turmaId);
    if (ok) {
      set((state) => ({ turmas: state.turmas.filter((t) => t.id !== turmaId) }));
    }
  },

  updateAttendeeStatus: async (turmaId: string, attendeeId: string, status: AttendanceStatus) => {
    await turmaService.updateAttendeeStatus(attendeeId, status);
    set((state) => ({
      turmas: state.turmas.map((t) => ({
        ...t,
        attendees: t.attendees.map((a) =>
          a.id === attendeeId ? { ...a, status } : a
        ),
      })),
    }));
  },

  addAttendee: async (turmaId, attendeeData) => {
    const newAttendee = await turmaService.addAttendee(turmaId, attendeeData);
    if (newAttendee) {
      set((state) => ({
        turmas: state.turmas.map((t) =>
          t.id === turmaId
            ? { ...t, attendees: [...t.attendees, newAttendee] }
            : t
        ),
      }));
    }
    return newAttendee;
  },

  removeAttendee: async (turmaId, attendeeId) => {
    // Optimistic update
    set((state) => ({
      turmas: state.turmas.map((t) =>
        t.id === turmaId
          ? { ...t, attendees: t.attendees.filter((a) => a.id !== attendeeId) }
          : t
      ),
    }));
    await turmaService.removeAttendee(attendeeId);
  },

  subscribe: () => {
    const supabase = getSupabaseClient();

    const channelId = `realtime:turmas-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turmas' }, (payload) => {
        console.log('Realtime Turma Event:', payload.eventType);
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => {
          let updated = [...state.turmas];
          if (eventType === 'INSERT') {
            if (!updated.some(t => t.id === (newRecord as Turma).id)) {
              updated = [{ ...(newRecord as Turma), attendees: [] }, ...updated];
            }
          } else if (eventType === 'UPDATE') {
            updated = updated.map(t => t.id === (newRecord as Turma).id ? { ...t, ...newRecord } : t);
          } else if (eventType === 'DELETE') {
            updated = updated.filter(t => t.id !== (oldRecord as any).id);
          }
          return { turmas: updated };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turma_attendees' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => ({
          turmas: state.turmas.map((t) => {
            if (eventType === 'INSERT') {
              const attendee = newRecord as TurmaAttendee & { turma_id: string };
              if (t.id !== attendee.turma_id) return t;
              if (t.attendees.some(a => a.id === attendee.id)) return t;
              return { ...t, attendees: [...t.attendees, attendee] };
            } else if (eventType === 'UPDATE') {
              const attendee = newRecord as TurmaAttendee & { turma_id: string };
              return { ...t, attendees: t.attendees.map(a => a.id === attendee.id ? { ...a, ...attendee } : a) };
            } else if (eventType === 'DELETE') {
              return { ...t, attendees: t.attendees.filter(a => a.id !== (oldRecord as any).id) };
            }
            return t;
          }),
        }));
      })
      .subscribe((status) => {
        console.log(`Realtime Turma Status (${channelId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
