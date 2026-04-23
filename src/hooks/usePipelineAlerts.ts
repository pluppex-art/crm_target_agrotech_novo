import { useMemo, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
import type { Lead } from '../types/leads';
import { checkLeadInactivity, fireAlerts } from '../services/alertService';
import type { Task } from '../services/taskService';

export const usePipelineAlerts = (leads: Lead[], tasks: Task[] = []) => {
  const { user } = useAuthStore();
  const { autoTransferHours, fetchSettings } = useSettingsStore();
  const { profiles } = useProfileStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Only check inactivity for leads assigned to the current user
  const myLeads = useMemo(() => {
    if (!user) return [];
    const myProfile = profiles.find(p => p.id === user.id);
    const myName = myProfile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || '';
    if (!myName) return leads;
    return leads.filter(l => l.responsible?.toLowerCase() === myName.toLowerCase());
  }, [leads, user, profiles]);

  const runInactivityCheck = useCallback(() => {
    if (myLeads.length === 0) return;
    const { alerts } = checkLeadInactivity(myLeads, autoTransferHours, tasks);
    if (alerts.length > 0) {
      const userEmail = user?.email || '';
      fireAlerts(alerts, userEmail);
    }
  }, [myLeads, autoTransferHours, user, tasks]);

  useEffect(() => {
    runInactivityCheck();
    const interval = setInterval(runInactivityCheck, 60_000);
    return () => clearInterval(interval);
  }, [runInactivityCheck]);
};
