-- Migration 007: Fix notification loop — 254k duplicates
-- Run this in Supabase SQL Editor
-- ============================================================

-- STEP 1: Identify the trigger causing the loop
-- (Run first to see what's generating notifications)
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- STEP 2: Emergency cleanup — keep only the 50 most recent per user
DELETE FROM notifications
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM notifications
  ) ranked
  WHERE rn <= 50
);

-- STEP 3: Add partial unique index to prevent duplicates
-- (allows at most 1 urgent notification per user per title per day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_unique_urgent
ON notifications (user_id, title, DATE(created_at))
WHERE type = 'urgent';

-- STEP 4: Add rate-limiting function — call this instead of INSERT directly
CREATE OR REPLACE FUNCTION create_notification_safe(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip if same urgent notification already exists today for this user
  IF p_type = 'urgent' THEN
    IF EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = p_user_id
        AND title = p_title
        AND DATE(created_at) = CURRENT_DATE
        AND type = 'urgent'
    ) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, created_at)
  VALUES (p_user_id, p_title, p_message, p_type, NOW())
  ON CONFLICT DO NOTHING;
END;
$$;

-- STEP 5: Clean old notifications daily (create a scheduled job or run manually)
-- DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';
