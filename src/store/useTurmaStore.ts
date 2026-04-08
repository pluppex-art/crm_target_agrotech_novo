import { create } from 'zustand';
import { turmaService, Turma, TurmaAttendee, AttendanceStatus } from '../services/turmaService';

export type { Turma, TurmaAttendee, AttendanceStatus };

interface TurmaState {
  turmas: Turma[];
  isLoading: boolean;
  setupRequired: boolean;
  fetchTurmas: () => Promise<void>;
  addTurma: (turma: Omit<Turma, 'id' | 'attendees'>) => Promise<void>;
  updateTurma: (turmaId: string, turma: Partial<Omit<Turma, 'id' | 'attendees'>>) => Promise<void>;
  removeTurma: (turmaId: string) => Promise<void>;
  updateAttendeeStatus: (turmaId: string, attendeeId: string, status: AttendanceStatus) => Promise<void>;
  addAttendee: (turmaId: string, attendee: Omit<TurmaAttendee, 'id'>) => Promise<TurmaAttendee | null>;
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

  updateAttendeeStatus: async (turmaId, attendeeId, status) => {
    await turmaService.updateAttendeeStatus(attendeeId, status);
    set((state) => ({
      turmas: state.turmas.map((t) =>
        t.id === turmaId
          ? {
              ...t,
              attendees: t.attendees.map((a) =>
                a.id === attendeeId ? { ...a, status } : a
              ),
            }
          : t
      ),
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
}));
