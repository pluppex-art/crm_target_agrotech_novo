-- Tabela de metas para a empresa e vendedores
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('company', 'seller')),
    seller_id TEXT, -- ID do perfil ou Nome (para compatibilidade)
    seller_name TEXT,
    revenue_goal NUMERIC DEFAULT 0,
    leads_goal INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices únicos para permitir UPSERT
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_company ON goals (type) WHERE type = 'company';
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_seller ON goals (type, seller_id) WHERE type = 'seller';

-- Habilitar RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Política de acesso total (ajuste conforme necessário para produção)
DROP POLICY IF EXISTS "Allow all access to goals" ON goals;
CREATE POLICY "Allow all access to goals" ON goals FOR ALL USING (true) WITH CHECK (true);
