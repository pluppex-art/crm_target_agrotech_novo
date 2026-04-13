import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Lead } from '../types/leads';
import { checkLeadInactivity, fireAlerts, InactivityAlert } from '../services/alertService';

export const usePipelineAlerts = (leads: Lead[]) => {
  const { user } = useAuthStore();
  const { autoTransferHours, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const runInactivityCheck = useCallback(() => {
    if (leads.length === 0) return;
    const { alerts } = checkLeadInactivity(leads, autoTransferHours);
    if (alerts.length > 0) {
      const userEmail = user?.email || '';
      fireAlerts(alerts, userEmail);
    }
  }, [leads, autoTransferHours, user]);

  useEffect(() => {
    runInactivityCheck();
    const interval = setInterval(runInactivityCheck, 60_000);
    return () => clearInterval(interval);
  }, [runInactivityCheck]);

  // Background hook only - no UI returns
};
