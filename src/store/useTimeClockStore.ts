import { create } from 'zustand';
import { timeClockService, TimeClockRecord } from '../services/timeClockService';

export type PontoStatus = 'off' | 'working' | 'break' | 'returned';

interface TimeClockState {
  status: PontoStatus;
  todayRecords: TimeClockRecord[];
  loading: boolean;
  setStatus: (status: PontoStatus) => void;
  syncFromDb: (userId: string) => Promise<void>;
  punch: (userId: string, type: TimeClockRecord['type']) => Promise<void>;
}

function loadCachedStatus(): PontoStatus {
  try {
    const saved = localStorage.getItem('ponto_status') as PontoStatus | null;
    if (saved && ['off', 'working', 'break', 'returned'].includes(saved)) return saved;
  } catch {}
  return 'off';
}

function typeToStatus(type: TimeClockRecord['type']): PontoStatus {
  if (type === 'entrada') return 'working';
  if (type === 'saida_intervalo') return 'break';
  if (type === 'volta_intervalo') return 'returned';
  return 'off';
}

export const useTimeClockStore = create<TimeClockState>((set) => ({
  status: loadCachedStatus(),
  todayRecords: [],
  loading: false,

  setStatus: (status) => {
    localStorage.setItem('ponto_status', status);
    set({ status });
  },

  syncFromDb: async (userId) => {
    set({ loading: true });
    try {
      const [records, latest] = await Promise.all([
        timeClockService.getTodayRecords(userId),
        timeClockService.getLatestRecord(userId),
      ]);

      // Derive status from latest record ever (not just today)
      const status: PontoStatus = latest ? typeToStatus(latest.type) : 'off';
      localStorage.setItem('ponto_status', status);
      set({ todayRecords: records, status, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  punch: async (userId, type) => {
    const record = await timeClockService.punch(userId, type);
    const status = typeToStatus(type);
    localStorage.setItem('ponto_status', status);
    set(state => ({
      status,
      todayRecords: [...state.todayRecords, record],
    }));
  },
}));
