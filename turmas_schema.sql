-- Turmas (Classes) Table
CREATE TABLE IF NOT EXISTS turmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    professor_name TEXT,
    professor_email TEXT,
    date DATE,
    time TEXT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT, -- Backup name if product is deleted
    location TEXT,
    status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'em_andamento', 'concluida', 'cancelada'))
);

-- Turma Attendees Table
CREATE TABLE IF NOT EXISTS turma_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    photo TEXT,
    responsible TEXT,
    status TEXT DEFAULT 'indeciso' CHECK (status IN ('matriculado', 'confirmado', 'indeciso', 'cancelado')),
    vendas NUMERIC DEFAULT 0
);

-- Enable RLS
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turma_attendees ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow all access to turmas" ON turmas;
DROP POLICY IF EXISTS "Allow all access to turma_attendees" ON turma_attendees;

CREATE POLICY "Allow all access to turmas" ON turmas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to turma_attendees" ON turma_attendees FOR ALL USING (true) WITH CHECK (true);

-- Fix: Add missing lead_id column for lead-turma relationship
ALTER TABLE turma_attendees 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_turma_attendees_lead_id ON turma_attendees(lead_id);
