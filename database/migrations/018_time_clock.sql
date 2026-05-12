-- Migration 018: Time Clock Records
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS time_clock_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('entrada', 'saida_intervalo', 'volta_intervalo', 'saida')),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tcr_user_timestamp ON time_clock_records (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tcr_timestamp ON time_clock_records (timestamp DESC);

-- RLS
ALTER TABLE time_clock_records ENABLE ROW LEVEL SECURITY;

-- Users can read their own records
CREATE POLICY "tcr_select_own" ON time_clock_records
  FOR SELECT USING (user_id = auth.uid());

-- Admins can read all records
CREATE POLICY "tcr_select_admin" ON time_clock_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN cargos c ON c.id = p.role_id
      WHERE p.id = auth.uid()
        AND (c.permissions::text LIKE '%admin.all%' OR p.department = 'Diretoria')
    )
  );

-- Users can insert their own records
CREATE POLICY "tcr_insert_own" ON time_clock_records
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can insert for any user (manual corrections)
CREATE POLICY "tcr_insert_admin" ON time_clock_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis p
      JOIN cargos c ON c.id = p.role_id
      WHERE p.id = auth.uid()
        AND (c.permissions::text LIKE '%admin.all%' OR p.department = 'Diretoria')
    )
  );
