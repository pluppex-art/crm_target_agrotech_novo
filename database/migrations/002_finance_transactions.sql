CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'OVERDUE')),
    category_id UUID REFERENCES financial_categories(id),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    class_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    source_transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
    due_date DATE,
    payment_date DATE,
    origin_type TEXT CHECK (origin_type IN ('MANUAL', 'PIPELINE', 'CLASS', 'COMMISSION', 'PARTNER')),
    partner_origin TEXT CHECK (partner_origin IN ('TARGET', 'PLUPPEX')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fin_tx_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_fin_tx_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_fin_tx_origin ON financial_transactions(origin_type);
CREATE INDEX IF NOT EXISTS idx_fin_tx_payment_date ON financial_transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_due_date ON financial_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_user_id ON financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_lead_id ON financial_transactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_class_id ON financial_transactions(class_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_category_id ON financial_transactions(category_id);

-- Idempotency Constraints (Partial Unique Indexes)

-- 1. Impede duplicidade de receita automática gerada pelo mesmo lead no Pipeline.
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_pipeline_income 
ON financial_transactions (lead_id) 
WHERE origin_type = 'PIPELINE' AND type = 'INCOME';

-- 2. Impede duplicidade de despesa de comissão originada de uma mesma receita paga para o mesmo vendedor.
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_commission_expense 
ON financial_transactions (source_transaction_id, user_id) 
WHERE origin_type = 'COMMISSION' AND type = 'EXPENSE';

-- Check Constraint: se status = PAID, payment_date não pode ser nulo
-- (Em muitos sistemas flexíveis, permite-se triggers preencherem, mas aqui vamos forçar integridade se PAID)
-- Alternativamente, a função trigger cuida disso.
-- Adicionando a trigger para garantir payment_date:
CREATE OR REPLACE FUNCTION set_payment_date_on_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'PAID' AND NEW.payment_date IS NULL THEN
        NEW.payment_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_payment_date
    BEFORE INSERT OR UPDATE ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION set_payment_date_on_paid();

-- RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view related transactions" ON financial_transactions FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can insert" ON financial_transactions FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can update" ON financial_transactions FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
