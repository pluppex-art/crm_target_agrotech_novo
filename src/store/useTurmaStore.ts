import { create } from 'zustand';
import { supabaseService } from '../services/supabaseService';

export type AttendanceStatus = 'confirmado' | 'indeciso' | 'cancelado';
export type TurmaStatus = 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';

export interface TurmaAttendee {
  id: string;
  name: string;
  photo: string;
  responsible: string;
  status: AttendanceStatus;
  vendas: number;
}

export interface Turma {
  id: string;
  name: string;
  professor_name?: string;
  professor_email?: string;
  date: string;
  time: string;
  product: string;
  location: string;
  status: TurmaStatus;
  attendees: TurmaAttendee[];
  created_at: string;
}

interface TurmaState {
  turmas: Turma[];
  isLoading: boolean;
  error: string | null;
  fetchTurmas: () => Promise<void>;
  addTurma: (turma: Omit<Turma, 'id' | 'created_at' | 'attendees'>) => Promise<void>;
  updateAttendeeStatus: (turmaId: string, attendeeId: string, status: AttendanceStatus) => Promise<void>;
  addAttendee: (turmaId: string, attendee: Omit<TurmaAttendee, 'id'>) => Promise<void>;
  removeTurma: (id: string) => Promise<void>;
  updateTurma: (id: string, turma: Partial<Omit<Turma, 'id' | 'created_at' | 'attendees'>>) => Promise<void>;
}

export const useTurmaStore = create<TurmaState>((set, get) => ({
  turmas: [],
  isLoading: false,
  error: null,

  fetchTurmas: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await supabaseService.getTurmas();
      // Map Supabase data (which has snake_case fields or nested attendees)
      const mappedTurmas: Turma[] = data.map((t: any) => ({
        id: t.id,
        name: t.name,
        professor_name: t.professor_name,
        professor_email: t.professor_email,
        date: t.date,
        time: t.time,
        product: t.product_name || '',
        location: t.location,
        status: t.status as TurmaStatus,
        created_at: t.created_at,
        attendees: (t.turma_attendees || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          photo: a.photo,
          responsible: a.responsible,
          status: a.status as AttendanceStatus,
          vendas: parseFloat(a.vendas) || 0,
        })),
      }));
      set({ turmas: mappedTurmas, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch turmas', isLoading: false });
    }
  },

  addTurma: async (turmaData) => {
    set({ isLoading: true, error: null });
    try {
      const newTurmaData = {
        name: turmaData.name,
        professor_name: turmaData.professor_name || null,
        professor_email: turmaData.professor_email || null,
        date: turmaData.date,
        time: turmaData.time,
        product_name: turmaData.product,
        location: turmaData.location,
        status: turmaData.status,
      };
      const created = await supabaseService.createTurma(newTurmaData);
      if (created) {
        set((state) => ({
          turmas: [...state.turmas, { ...created, product: created.product_name, attendees: [] }],
          isLoading: false
        }));
      }
    } catch (err) {
      set({ error: 'Failed to add turma', isLoading: false });
    }
  },

  updateAttendeeStatus: async (turmaId, attendeeId, status) => {
    // Optimistic update
    const prevTurmas = get().turmas;
    set({
      turmas: prevTurmas.map(t =>
        t.id === turmaId
          ? { ...t, attendees: t.attendees.map(a => a.id === attendeeId ? { ...a, status } : a) }
          : t
      ),
    });

    try {
      const success = await supabaseService.updateAttendeeStatus(attendeeId, status);
      if (!success) set({ turmas: prevTurmas, error: 'Failed to update attendee status' });
    } catch (err) {
      set({ turmas: prevTurmas, error: 'Failed to update attendee status' });
    }
  },

  addAttendee: async (turmaId, attendee) => {
    try {
      const created = await supabaseService.addAttendee(turmaId, attendee);
      if (created) {
        set((state) => ({
          turmas: state.turmas.map(t =>
            t.id === turmaId ? { ...t, attendees: [...t.attendees, { ...created, vendas: parseFloat(created.vendas) || 0 }] } : t
          ),
        }));
      }
    } catch (err) {
      set({ error: 'Failed to add attendee' });
    }
  },

  removeTurma: async (id) => {
    const prevTurmas = get().turmas;
    set({ turmas: prevTurmas.filter(t => t.id !== id) });
    try {
      const success = await supabaseService.deleteTurma(id);
      if (!success) set({ turmas: prevTurmas, error: 'Failed to delete turma' });
    } catch (err) {
      set({ turmas: prevTurmas, error: 'Failed to delete turma' });
    }
  },

  updateTurma: async (id, turmaData) => {
    set({ isLoading: true, error: null });
    try {
      const mappedData = {
        name: turmaData.name,
        professor_name: turmaData.professor_name,
        professor_email: turmaData.professor_email,
        date: turmaData.date,
        time: turmaData.time,
        product_name: turmaData.product,
        location: turmaData.location,
        status: turmaData.status,
      };
      const success = await supabaseService.updateTurma(id, mappedData);
      if (success) {
        set((state) => ({
          turmas: state.turmas.map(t => t.id === id ? { ...t, ...turmaData } : t),
          isLoading: false
        }));
      } else {
        set({ error: 'Failed to update turma', isLoading: false });
      }
    } catch (err) {
      set({ error: 'Failed to update turma', isLoading: false });
    }
  },
}));
