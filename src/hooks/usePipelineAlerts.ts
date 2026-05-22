import { useMemo, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
import type { Lead } from '../types/leads';
import { checkLeadInactivity, fireAlerts, getSentAlerts } from '../services/alertService';
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
    return leads.filter(l => l.responsavel_usuario_id === user.id);
  }, [leads, user]);

  const runInactivityCheck = useCallback(() => {
    if (myLeads.length === 0) return;
    if (!notificationPrefs.leadInactive) return;

    const { alerts, toTransfer } = checkLeadInactivity(myLeads, autoTransferHours, tasks, notificationPrefs.inactivityLevels);

    if (alerts.length > 0) {
      const userEmail = user?.email || '';
      fireAlerts(alerts, userEmail, undefined, user?.id);
    }

    // Notify admins/coordinators only the first time a lead crosses the transfer threshold
    const sentAlerts = getSentAlerts();
    for (const lead of toTransfer) {
      // Use a session-level global to prevent same-tab race conditions
      const sessionKey = `transfer_notified_${lead.id}`;
      if (!(window as any)[sessionKey] && !sentAlerts[lead.id]?.h48) {
        (window as any)[sessionKey] = true;
        notifyLeadTransferred(lead, lead.responsavel_usuario_id || '', profiles);
      }
    }
  }, [myLeads, autoTransferHours, notificationPrefs, user, tasks, profiles]);

  useEffect(() => {
    runInactivityCheck();
    const interval = setInterval(runInactivityCheck, 60_000);
    return () => clearInterval(interval);
  }, [runInactivityCheck]);
};
