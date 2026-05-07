-- Tabela de Metas (Goals)
-- Execute este SQL no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('company', 'seller')),
  seller_name TEXT,
  seller_id TEXT,
  revenue_goal NUMERIC DEFAULT 0,
  leads_goal NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
CREATE INDEX IF NOT EXISTS idx_goals_seller_id ON goals(seller_id);
CREATE INDEX IF NOT EXISTS idx_goals_seller_name ON goals(seller_name);

-- Ativar RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Política: permitir SELECT para todos os usuários autenticados
CREATE POLICY "Allow select goals" ON goals
  FOR SELECT TO authenticated USING (true);

-- Política: permitir INSERT/UPDATE/DELETE para usuários autenticados (ajuste conforme necessário)
CREATE POLICY "Allow insert goals" ON goals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update goals" ON goals
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete goals" ON goals
  FOR DELETE TO authenticated USING (true);

