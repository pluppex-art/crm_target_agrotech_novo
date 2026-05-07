-- Turmas (Classes) Table - Normalized version
-- Turmas are instances of Products (Cursos/Serviços)

CREATE TABLE IF NOT EXISTS turmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Relacionamento com Produto (Obrigatório)
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Dados específicos desta Turma/Instância
    name TEXT NOT NULL, -- Ex: "Turma 01 - Matutino"
    date DATE,
    time TEXT,
    location TEXT,
    
    -- Dados do Professor
    professor_name TEXT,
    professor_email TEXT,
    
    status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'em_andamento', 'concluida', 'cancelada'))
);

-- Turma Attendees Table
CREATE TABLE IF NOT EXISTS turma_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    photo TEXT,
    responsible TEXT,
    status TEXT DEFAULT 'indeciso' CHECK (status IN ('matriculado', 'confirmado', 'indeciso', 'cancelado')),
    vendas NUMERIC DEFAULT 0
);

-- Enable RLS
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turma_attendees ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access to turmas" ON turmas;
DROP POLICY IF EXISTS "Allow all access to turma_attendees" ON turma_attendees;

CREATE POLICY "Allow all access to turmas" ON turmas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to turma_attendees" ON turma_attendees FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_turmas_product_id ON turmas(product_id);
CREATE INDEX IF NOT EXISTS idx_turma_attendees_turma_id ON turma_attendees(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_attendees_lead_id ON turma_attendees(lead_id);
