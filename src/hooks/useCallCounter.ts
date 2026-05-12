import { useState, useEffect } from 'react';
import { callService } from '../services/callService';
import { useAuthStore } from '../store/useAuthStore';

export function useCallCounter(leadId: string) {
  const { user } = useAuthStore();
  const [todayCount, setTodayCount] = useState(0);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (user?.id) callService.getTodayCount(user.id).then(setTodayCount);
  }, [user?.id]);

  const logCall = async () => {
    if (!user?.id || logging) return;
    setLogging(true);
    const ok = await callService.logCall(user.id, leadId);
    if (ok) setTodayCount(c => c + 1);
    setLogging(false);
  };

  return { todayCount, logCall, logging };
}
