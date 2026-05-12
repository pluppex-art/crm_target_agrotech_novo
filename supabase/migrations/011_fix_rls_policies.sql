-- #S01 + #S02 — Corrigir políticas RLS para leads e perfis

-- ──────────────────────────────────────────────────────────────────────────────
-- S01: Leads — isolamento por vendedor/squad
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS leads_pipeline_rls ON leads;
DROP POLICY IF EXISTS "Allow all access to leads" ON leads;

-- SELECT: vendedor vê seus leads + leads do seu squad + admin vê todos
CREATE POLICY leads_select ON leads
  FOR SELECT TO authenticated
  USING (
    -- Próprios leads (por nome ou por UUID)
    responsible = (SELECT name FROM perfis WHERE id = auth.uid())
    OR responsavel_usuario_id = auth.uid()
    -- Leads do mesmo squad
    OR EXISTS (
      SELECT 1
        FROM squad_members sm
        JOIN squads s ON s.id = sm.squad_id
        JOIN squad_members sm2 ON sm2.squad_id = s.id
        JOIN perfis p ON p.id = sm2.user_id
       WHERE sm.user_id = auth.uid()
         AND (p.name = leads.responsible OR sm2.user_id = leads.responsavel_usuario_id)
         AND sm.active = TRUE
    )
    -- Admin/coordenador vê todos
    OR EXISTS (
      SELECT 1
        FROM perfis p
        JOIN cargos c ON c.id = p.role_id
       WHERE p.id = auth.uid()
         AND (
           c.permissions @> '["admin.all"]'::jsonb
           OR LOWER(c.name) LIKE '%admin%'
           OR LOWER(c.name) LIKE '%coordenador%'
         )
    )
  );

-- INSERT: vendedor pode criar lead para si mesmo ou com permissão leads.create
CREATE POLICY leads_insert ON leads
  FOR INSERT TO authenticated
  WITH CHECK (
    responsible = (SELECT name FROM perfis WHERE id = auth.uid())
    OR responsavel_usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM perfis p
        JOIN cargos c ON c.id = p.role_id
       WHERE p.id = auth.uid()
         AND (
           c.permissions @> '["leads.create"]'::jsonb
           OR c.permissions @> '["admin.all"]'::jsonb
         )
    )
  );

-- UPDATE: vendedor edita só seus próprios leads
CREATE POLICY leads_update ON leads
  FOR UPDATE TO authenticated
  USING (
    responsible = (SELECT name FROM perfis WHERE id = auth.uid())
    OR responsavel_usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM perfis p
        JOIN cargos c ON c.id = p.role_id
       WHERE p.id = auth.uid()
         AND c.permissions @> '["admin.all"]'::jsonb
    )
  );

-- DELETE: apenas admin
CREATE POLICY leads_delete ON leads
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM perfis p
        JOIN cargos c ON c.id = p.role_id
       WHERE p.id = auth.uid()
         AND c.permissions @> '["admin.all"]'::jsonb
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- S02: Perfis — proteção LGPD
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access to perfis" ON perfis;
DROP POLICY IF EXISTS perfis_select_own ON perfis;
DROP POLICY IF EXISTS perfis_select_manager ON perfis;

-- Usuário vê apenas o próprio perfil
CREATE POLICY perfis_select_own ON perfis
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Gestor/admin vê todos os perfis
CREATE POLICY perfis_select_manager ON perfis
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM perfis p
        JOIN cargos c ON c.id = p.role_id
       WHERE p.id = auth.uid()
         AND (
           c.permissions @> '["users.view"]'::jsonb
           OR c.permissions @> '["admin.all"]'::jsonb
           OR LOWER(c.name) LIKE '%admin%'
           OR LOWER(c.name) LIKE '%coordenador%'
         )
    )
  );

-- Revogar acesso anônimo à tabela perfis
REVOKE ALL ON perfis FROM anon;

-- ──────────────────────────────────────────────────────────────────────────────
-- Políticas para tasks — isolamento por responsável
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all access to tasks" ON tasks;

CREATE POLICY tasks_select ON tasks
  FOR SELECT TO authenticated
  USING (
    responsavel_usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM perfis p
        JOIN cargos c ON c.id = p.role_id
       WHERE p.id = auth.uid()
         AND (
           c.permissions @> '["admin.all"]'::jsonb
           OR LOWER(c.name) LIKE '%admin%'
           OR LOWER(c.name) LIKE '%coordenador%'
           OR LOWER(c.name) LIKE '%gerente%'
         )
    )
  );

CREATE POLICY tasks_insert ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY tasks_update ON tasks
  FOR UPDATE TO authenticated
  USING (
    responsavel_usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM perfis p
        JOIN cargos c ON c.id = p.role_id
       WHERE p.id = auth.uid()
         AND c.permissions @> '["admin.all"]'::jsonb
    )
  );
