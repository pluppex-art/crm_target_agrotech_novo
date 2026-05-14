-- Migration 013: Add DELETE policy for call_logs and notes
-- This allows users to delete their own call logs and related notes.

-- Call Logs
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete their own call logs" ON call_logs;
CREATE POLICY "Users can delete their own call logs" ON call_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM perfis p 
    JOIN cargos c ON c.id = p.role_id 
    WHERE p.id = auth.uid() AND (c.permissions @> '["admin.all"]'::jsonb OR LOWER(c.name) LIKE '%admin%')
  ));

DROP POLICY IF EXISTS "Users can select call logs" ON call_logs;
CREATE POLICY "Users can select call logs" ON call_logs
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert call logs" ON call_logs;
CREATE POLICY "Users can insert call logs" ON call_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Notes (ensure delete is allowed for call notes)
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR EXISTS (
    SELECT 1 FROM perfis p 
    JOIN cargos c ON c.id = p.role_id 
    WHERE p.id = auth.uid() AND (c.permissions @> '["admin.all"]'::jsonb OR LOWER(c.name) LIKE '%admin%')
  ));
