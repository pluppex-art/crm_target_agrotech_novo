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

  const removeLastCall = async () => {
    if (!user?.id || logging || todayCount <= 0) return;
    setLogging(true);
    const ok = await callService.removeLastCall(user.id, leadId);
    if (ok) setTodayCount(c => Math.max(0, c - 1));
    setLogging(false);
  };

  return { todayCount, logCall, removeLastCall, logging };
}
