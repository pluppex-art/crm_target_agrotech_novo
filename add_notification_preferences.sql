-- Migration: add notification_preferences to crm_settings
-- Also fixes the key name inconsistency: ensures lead_transfer_timeout_hours exists

-- Ensure lead_transfer_timeout_hours exists (correct key name used by useSettingsStore)
INSERT INTO crm_settings (key, value)
VALUES ('lead_transfer_timeout_hours', '48')
ON CONFLICT (key) DO NOTHING;

-- Remove the old mismatched key if it exists (was saved by the old settings page)
DELETE FROM crm_settings WHERE key = 'auto_transfer_hours';

-- Insert default notification preferences
INSERT INTO crm_settings (key, value)
VALUES (
  'notification_preferences',
  '{"newLead": true, "leadInactive": true, "leadAssigned": true, "stageChange": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
