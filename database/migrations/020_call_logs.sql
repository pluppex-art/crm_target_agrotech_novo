-- Migration 020: Call Logs
-- Run in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS call_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  lead_id    UUID REFERENCES leads(id) ON DELETE SET NULL,
  called_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cl_user_date ON call_logs (user_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_cl_lead     ON call_logs (lead_id);
CREATE INDEX IF NOT EXISTS idx_cl_date     ON call_logs (called_at DESC);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Each user can read their own calls
CREATE POLICY "cl_select_own" ON call_logs
  FOR SELECT USING (user_id = auth.uid());

-- Admins can read all
CREATE POLICY "cl_select_admin" ON call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN cargos c ON c.id = p.role_id
      WHERE p.id = auth.uid()
        AND (c.permissions::text LIKE '%admin.all%' OR p.department = 'Diretoria')
    )
  );

-- Users can insert their own calls
CREATE POLICY "cl_insert_own" ON call_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
