import { create } from 'zustand';
import { Cargo, cargosService } from '../services/cargosService';
import { getSupabaseClient } from '../lib/supabase';

interface CargoState {
  cargos: Cargo[];
  loading: boolean;
  fetchCargos: () => Promise<void>;
  addCargo: (cargo: any) => Promise<void>;
  updateCargo: (id: string, cargo: Partial<Cargo>) => Promise<boolean>;
  deleteCargo: (id: string) => Promise<void>;
  subscribe: () => () => void;
}

export const useCargoStore = create<CargoState>((set, get) => ({
  cargos: [],
  loading: false,

  fetchCargos: async () => {
    set({ loading: true });
    const cargos = await cargosService.getCargos();
    set({ cargos, loading: false });
  },

  addCargo: async (cargo) => {
    const { data: newCargo, error } = await cargosService.createCargo(cargo);
    if (error) throw error;
    if (newCargo) {
      set({ cargos: [...get().cargos, newCargo] });
    }
  },

  updateCargo: async (id: string, cargo) => {
    const { data: updatedCargo, error } = await cargosService.updateCargo(id, cargo);
    if (error) {
      console.error('Store: Error updating cargo:', error);
      throw error;
    }
    if (updatedCargo) {
      set({
        cargos: get().cargos.map((c) => (c.id === id ? updatedCargo : c)),
      });
      return true;
    }
    return false;
  },

  deleteCargo: async (id) => {
    const success = await cargosService.deleteCargo(id);
    if (success) {
      set({ cargos: get().cargos.filter((c) => c.id !== id) });
    }
  },

  subscribe: () => {
    const supabase = getSupabaseClient();

    const channelId = `cargos-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cargos' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        set((state) => {
          let updated = [...state.cargos];
          if (eventType === 'INSERT') {
            updated = [...updated, newRecord as Cargo];
          } else if (eventType === 'UPDATE') {
            updated = updated.map(p => p.id === (newRecord as Cargo).id ? newRecord as Cargo : p);
          } else if (eventType === 'DELETE') {
            updated = updated.filter(p => p.id !== (oldRecord as any).id);
          }
          return { cargos: updated };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));

