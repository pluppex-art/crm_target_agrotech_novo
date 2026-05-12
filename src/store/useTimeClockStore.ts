import { create } from 'zustand';

export type PontoStatus = 'off' | 'working' | 'break' | 'returned';

interface TimeClockState {
  status: PontoStatus;
  setStatus: (status: PontoStatus) => void;
}

function loadStatus(): PontoStatus {
  try {
    const saved = localStorage.getItem('ponto_status') as PontoStatus | null;
    if (saved && ['off', 'working', 'break', 'returned'].includes(saved)) return saved;
  } catch {}
  return 'off';
}

export const useTimeClockStore = create<TimeClockState>((set) => ({
  status: loadStatus(),
  setStatus: (status) => {
    localStorage.setItem('ponto_status', status);
    set({ status });
  },
}));
