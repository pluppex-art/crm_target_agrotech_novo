CREATE TABLE IF NOT EXISTS squads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS squad_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role_type TEXT CHECK (role_type IN ('CLOSER', 'SDR')),
    active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Unique member active per squad
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_active_member ON squad_members (user_id) WHERE active = true;

-- RLS
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON squads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for authenticated users" ON squad_members FOR SELECT USING (auth.role() = 'authenticated');
