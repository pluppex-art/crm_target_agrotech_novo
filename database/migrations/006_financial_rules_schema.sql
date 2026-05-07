-- 006_financial_rules_schema.sql

-- Tabela para regras de parceria
CREATE TABLE IF NOT EXISTS partner_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_type TEXT NOT NULL CHECK (origin_type IN ('TARGET', 'PLUPPEX')),
    technology_fee_percent NUMERIC(5,2) DEFAULT 0,
    fixed_fee NUMERIC(15,2) DEFAULT 0,
    category_id UUID REFERENCES financial_categories(id),
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela genérica para taxas e deduções
CREATE TABLE IF NOT EXISTS financial_fee_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    amount NUMERIC(15,2) DEFAULT 0,
    is_percentage BOOLEAN DEFAULT true,
    type TEXT NOT NULL CHECK (type IN ('TAX', 'GATEWAY', 'DISCOUNT', 'ADMIN_FEE', 'TECHNOLOGY')),
    application_context TEXT NOT NULL CHECK (application_context IN ('GROSS_REVENUE', 'NET_REVENUE', 'SPECIFIC_SALE', 'CLASS', 'PARTNER')),
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE partner_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_fee_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON partner_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for admins" ON partner_rules FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Enable read access for all authenticated users" ON financial_fee_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for admins" ON financial_fee_rules FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_partner_rules_updated_at
    BEFORE UPDATE ON partner_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_fee_rules_updated_at
    BEFORE UPDATE ON financial_fee_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial partner rules logic (10% fee for Pluppex)
INSERT INTO partner_rules (origin_type, technology_fee_percent, active) VALUES ('PLUPPEX', 10.00, true);
INSERT INTO partner_rules (origin_type, technology_fee_percent, active) VALUES ('TARGET', 0.00, true);
