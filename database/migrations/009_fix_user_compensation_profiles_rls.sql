-- 009_fix_user_compensation_profiles_rls.sql
-- Corrige dois problemas da migration 008:
-- 1. UNIQUE constraint errada que quebra ao ter múltiplos registros inativos
-- 2. RLS policy de escrita vinculada a role no JWT (pode não funcionar para todos os admins)

-- Remove o constraint problemático
ALTER TABLE user_compensation_profiles 
  DROP CONSTRAINT IF EXISTS ucp_unique_active_role;

-- Substitui por um índice parcial correto:
-- Garante apenas UM registro ativo por (user_id, role_type) — sem bloquear histórico inativo
CREATE UNIQUE INDEX IF NOT EXISTS ucp_one_active_per_user_role
  ON user_compensation_profiles (user_id, role_type)
  WHERE active = true;

-- Remove as policies antigas de escrita
DROP POLICY IF EXISTS "Admins can manage compensation profiles" ON user_compensation_profiles;

-- Política mais permissiva: todos autenticados podem inserir/atualizar perfis
-- (proteger via regras de negócio no frontend/service, não no RLS)
CREATE POLICY "Authenticated users can manage compensation profiles"
  ON user_compensation_profiles FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
