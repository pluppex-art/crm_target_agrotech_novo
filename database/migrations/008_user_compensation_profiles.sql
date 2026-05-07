-- 008_user_compensation_profiles.sql
-- Fonte oficial do nível de cargo e função no OTE para cada usuário.
-- Substitui o uso de nível hardcoded no recálculo de OTE.
-- commission_results.level continua existindo como SNAPSHOT histórico de auditoria.

CREATE TABLE IF NOT EXISTS user_compensation_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('CLOSER', 'SDR', 'MANAGER')),
    level TEXT NOT NULL,  -- Ex: 'Junior 1', 'Pleno 2', 'Sênior 3', etc.
    active BOOLEAN DEFAULT true,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Um usuário pode ter apenas um perfil ativo por role_type
    CONSTRAINT ucp_unique_active_role UNIQUE (user_id, role_type, active)
);

COMMENT ON TABLE user_compensation_profiles IS
    'Fonte oficial do nível/função de cada colaborador no OTE. '
    'O campo commission_results.level é um snapshot de auditoria deste valor no momento do cálculo.';

-- Trigger updated_at
CREATE TRIGGER update_user_compensation_profiles_updated_at
    BEFORE UPDATE ON user_compensation_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_compensation_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read compensation profiles"
    ON user_compensation_profiles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage compensation profiles"
    ON user_compensation_profiles FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Índice para lookup rápido no recálculo OTE
CREATE INDEX IF NOT EXISTS idx_ucp_user_active ON user_compensation_profiles (user_id, active);
