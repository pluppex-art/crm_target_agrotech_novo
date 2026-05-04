CREATE TABLE IF NOT EXISTS commission_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_type TEXT CHECK (role_type IN ('CLOSER', 'SDR', 'MANAGER')),
    level TEXT NOT NULL,
    fixed_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    variable_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    target_quantity INTEGER DEFAULT 0,
    target_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
    accelerator_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Seed approved OTE Rules for Closers
INSERT INTO commission_rules (role_type, level, target_quantity, target_revenue, fixed_amount, variable_amount, accelerator_amount) VALUES
    ('CLOSER', 'APRENDIZ', 0, 0, 1620, 0, 0),
    ('CLOSER', 'JUNIOR 1', 10, 45000, 1620, 1620, 300),
    ('CLOSER', 'JUNIOR 2', 12, 53000, 1800, 1800, 300),
    ('CLOSER', 'JUNIOR 3', 15, 70000, 2000, 2000, 300),
    ('CLOSER', 'PLENO 1', 22, 103000, 2250, 2250, 400),
    ('CLOSER', 'PLENO 2', 26, 122000, 2500, 2500, 400),
    ('CLOSER', 'PLENO 3', 30, 140000, 2750, 2750, 400),
    ('CLOSER', 'SENIOR 1', 35, 164000, 3250, 3250, 500),
    ('CLOSER', 'SENIOR 2', 40, 187000, 3750, 3750, 500),
    ('CLOSER', 'SENIOR 3', 45, 211000, 4250, 4250, 500)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS commission_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    squad_id UUID REFERENCES squads(id) ON DELETE SET NULL,
    role_type TEXT NOT NULL,
    period_month DATE NOT NULL,
    target_revenue NUMERIC(12,2) DEFAULT 0,
    realized_revenue NUMERIC(12,2) DEFAULT 0,
    achievement_percent NUMERIC(5,2) DEFAULT 0,
    fixed_amount NUMERIC(10,2) DEFAULT 0,
    variable_amount NUMERIC(10,2) DEFAULT 0,
    accelerator_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    semaphore_status TEXT CHECK (semaphore_status IN ('RED', 'YELLOW', 'GREEN')),
    status TEXT CHECK (status IN ('TO_PAY', 'PAID', 'CANCELLED')) DEFAULT 'TO_PAY',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comm_res_user_id ON commission_results(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_res_period ON commission_results(period_month);
CREATE INDEX IF NOT EXISTS idx_comm_res_role ON commission_results(role_type);
CREATE INDEX IF NOT EXISTS idx_comm_res_squad ON commission_results(squad_id);
CREATE INDEX IF NOT EXISTS idx_comm_res_status ON commission_results(status);

-- Idempotency Constraints (Opção A - Dois índices parciais para evitar NULL duplicates)
-- 1. Quando squad_id é NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_comm_res_no_squad 
ON commission_results (user_id, period_month, role_type) 
WHERE squad_id IS NULL;

-- 2. Quando squad_id NÃO é NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_comm_res_with_squad 
ON commission_results (user_id, period_month, role_type, squad_id) 
WHERE squad_id IS NOT NULL;

-- RLS
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON commission_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can view own commissions or if manager" ON commission_results FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');
