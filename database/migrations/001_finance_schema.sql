-- 001_finance_schema.sql
-- Extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS financial_categories CASCADE;

CREATE TABLE financial_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    dre_group TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Basic RLS
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all authenticated users" ON financial_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for admins" ON financial_categories FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Seed initial categories based on DRE structure
INSERT INTO financial_categories (name, type, dre_group, is_system) VALUES
    ('Venda de Curso', 'INCOME', 'RECEITA_BRUTA', true),
    ('Venda de Serviço', 'INCOME', 'RECEITA_BRUTA', true),
    ('Impostos (Simples/Presumido)', 'EXPENSE', 'DEDUCOES', true),
    ('Taxas de Cartão/Gateway', 'EXPENSE', 'DEDUCOES', true),
    ('Comissão de Vendedores', 'EXPENSE', 'DEDUCOES', true),
    ('Repasse de Parceiros', 'EXPENSE', 'CSP', true),
    ('Remuneração Instrutor (CSP)', 'EXPENSE', 'CSP', true),
    ('Marketing e Anúncios', 'EXPENSE', 'DESPESAS_OP', true),
    ('Folha de Pagamento', 'EXPENSE', 'DESPESAS_OP', true),
    ('Software e Ferramentas', 'EXPENSE', 'DESPESAS_OP', true),
    ('Despesas Bancárias', 'EXPENSE', 'RESULTADO_FIN', true)
ON CONFLICT (name) DO NOTHING;
