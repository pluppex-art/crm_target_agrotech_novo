import { useMemo, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
import type { Lead } from '../types/leads';
import { checkLeadInactivity, fireAlerts } from '../services/alertService';
import { notifyLeadTransferred } from '../services/leadNotificationService';
import type { Task } from '../services/taskService';

export const usePipelineAlerts = (leads: Lead[], tasks: Task[] = []) => {
  const { user } = useAuthStore();
  const { autoTransferHours, notificationPrefs, fetchSettings } = useSettingsStore();
  const { profiles } = useProfileStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const myLeads = useMemo(() => {
    if (!user) return [];
    const myProfile = profiles.find(p => p.id === user.id);
    const myName = myProfile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || '';
    if (!myName) return leads;
    return leads.filter(l => l.responsible?.toLowerCase() === myName.toLowerCase());
  }, [leads, user, profiles]);

  const runInactivityCheck = useCallback(() => {
    if (myLeads.length === 0) return;
    if (!notificationPrefs.leadInactive) return;

    const { alerts, toTransfer } = checkLeadInactivity(myLeads, autoTransferHours, tasks);

    if (alerts.length > 0) {
      const userEmail = user?.email || '';
      fireAlerts(alerts, userEmail);
    }

    // Notify admins/coordinators for leads that reached the transfer threshold
    for (const lead of toTransfer) {
      notifyLeadTransferred(lead, lead.responsible || '', profiles);
    }
  }, [myLeads, autoTransferHours, notificationPrefs, user, tasks, profiles]);

  useEffect(() => {
    runInactivityCheck();
    const interval = setInterval(runInactivityCheck, 60_000);
    return () => clearInterval(interval);
  }, [runInactivityCheck]);
};
