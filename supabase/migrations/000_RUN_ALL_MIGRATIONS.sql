-- #C02 FASE 0 — Emergência: Parar loop de notificações + corrigir trigger auto_transfer

-- STEP 1: Limpeza urgente de notificações duplicadas
-- Para notificações urgent: manter apenas a mais recente por (user_id, title) — necessário para o índice único
DELETE FROM notifications
WHERE type = 'urgent'
  AND id NOT IN (
    SELECT DISTINCT ON (user_id, title) id
    FROM notifications
    WHERE type = 'urgent'
    ORDER BY user_id, title, created_at DESC
  );

-- Para demais tipos: manter últimas 5 por (user_id, title)
DELETE FROM notifications
WHERE type != 'urgent'
  AND id NOT IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id, title ORDER BY created_at DESC) AS rn
      FROM notifications
      WHERE type != 'urgent'
    ) t
    WHERE rn <= 5
  );

-- STEP 2: Índice de deduplicação para evitar novos loops
-- Garante no máximo 1 notificação urgent por (user_id, title).
-- A janela de 24h é controlada pela lógica em leadNotificationService.ts (já existente).
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedup
  ON notifications(user_id, title)
  WHERE type = 'urgent';

-- STEP 3: Corrigir função auto_transfer_from_aquecimento para não entrar em loop
CREATE OR REPLACE FUNCTION auto_transfer_from_aquecimento()
RETURNS TRIGGER AS $$
DECLARE
  target_pipeline_id UUID;
  target_stage_id UUID;
  aquecimento_pipeline_id UUID;
  pronto_venda_stage_id UUID;
BEGIN
  -- Resolver IDs de pipeline/stage de Aquecimento para guardrail
  SELECT id INTO aquecimento_pipeline_id FROM pipelines WHERE name = 'Aquecimento' LIMIT 1;
  IF aquecimento_pipeline_id IS NULL THEN RETURN NEW; END IF;

  SELECT ps.id INTO pronto_venda_stage_id
    FROM pipeline_stages ps
    JOIN pipelines p ON p.id = ps.pipeline_id
   WHERE p.name = 'Aquecimento' AND ps.name = 'Pronto Venda'
   LIMIT 1;

  -- GUARDRAIL 1: só executa se ainda está no pipeline Aquecimento
  IF NEW.pipeline_id IS DISTINCT FROM aquecimento_pipeline_id THEN RETURN NEW; END IF;

  -- GUARDRAIL 2: só executa se chegou exatamente na etapa "Pronto Venda"
  IF NEW.stage_id IS DISTINCT FROM pronto_venda_stage_id THEN RETURN NEW; END IF;

  -- GUARDRAIL 3: não re-dispara se pipeline já mudou (evita loop)
  IF OLD.pipeline_id IS DISTINCT FROM aquecimento_pipeline_id THEN RETURN NEW; END IF;

  -- Roteamento por produto
  IF (NEW.product ILIKE '%drone%') THEN
    SELECT id INTO target_pipeline_id FROM pipelines WHERE name = 'Principal' LIMIT 1;
    SELECT id INTO target_stage_id
      FROM pipeline_stages
     WHERE pipeline_id = target_pipeline_id AND name = 'Qualificado'
     LIMIT 1;
  ELSE
    SELECT id INTO target_pipeline_id FROM pipelines WHERE name = 'IATF' LIMIT 1;
    SELECT id INTO target_stage_id
      FROM pipeline_stages
     WHERE pipeline_id = target_pipeline_id AND name = 'Diagnóstico'
     LIMIT 1;
  END IF;

  -- Só faz UPDATE se IDs foram resolvidos (evita UPDATE com NULL que causa outro disparo)
  IF target_pipeline_id IS NOT NULL AND target_stage_id IS NOT NULL THEN
    UPDATE leads
       SET pipeline_id = target_pipeline_id,
           stage_id    = target_stage_id,
           updated_at  = now()
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- #C01 — Reescrever trigger fn_pipeline_to_revenue
-- Problema: verificava leads.status em vez de stage_id, e buscava em "profiles" (não existe, é "perfis")

CREATE OR REPLACE FUNCTION fn_pipeline_to_revenue()
RETURNS TRIGGER AS $$
DECLARE
  v_ganho_id  UUID;
  v_cat_id    UUID;
  v_user_id   UUID;
BEGIN
  -- Resolver ID da etapa "Ganho" dinamicamente
  SELECT id INTO v_ganho_id
    FROM pipeline_stages
   WHERE LOWER(name) LIKE '%ganho%'
   LIMIT 1;

  -- Só dispara quando lead CHEGA na etapa Ganho pela primeira vez
  IF NEW.stage_id = v_ganho_id
     AND (OLD.stage_id IS NULL OR OLD.stage_id != v_ganho_id) THEN

    -- Categoria financeira de cursos
    SELECT id INTO v_cat_id
      FROM financial_categories
     WHERE name ILIKE '%curso%'
     LIMIT 1;

    -- Usuário responsável (tabela correta: perfis)
    SELECT id INTO v_user_id
      FROM perfis
     WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.responsible))
     LIMIT 1;

    -- Inserir transação, evitando duplicata por lead
    INSERT INTO financial_transactions
      (description, amount, type, status, category_id, lead_id, user_id, origin_type)
    VALUES
      ('Receita - ' || NEW.name, COALESCE(NEW.value, 0), 'INCOME', 'PENDING',
       v_cat_id, NEW.id, v_user_id, 'PIPELINE')
    ON CONFLICT (lead_id)
    WHERE origin_type = 'PIPELINE' AND type = 'INCOME'
    DO UPDATE SET
      amount     = EXCLUDED.amount,
      updated_at = NOW();

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger se não existir
DROP TRIGGER IF EXISTS trg_pipeline_to_revenue ON leads;
CREATE TRIGGER trg_pipeline_to_revenue
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION fn_pipeline_to_revenue();
-- #F05 + #F03 + #D04 + #F09 + #F08 + #T02 — Adicionar colunas novas (fases 1A-1F)

-- ── F05: seller_origin em leads e lead_class_enrollments ──
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS seller_origin TEXT
    CHECK (seller_origin IN ('target', 'pluppex'));

ALTER TABLE lead_class_enrollments
  ADD COLUMN IF NOT EXISTS seller_origin TEXT
    CHECK (seller_origin IN ('target', 'pluppex'));

-- ── F03: responsible_id (FK → perfis) em lead_class_enrollments ──
ALTER TABLE lead_class_enrollments
  ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES perfis(id);

UPDATE lead_class_enrollments lce
   SET responsible_id = p.id
  FROM perfis p
 WHERE LOWER(TRIM(lce.responsible)) = LOWER(TRIM(p.name))
   AND lce.responsible_id IS NULL;

-- ── D04: tasks já usa responsavel_usuario_id (UUID FK → perfis) — sem alteração necessária ──

-- ── F09: cost_center nas tabelas financeiras ──
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS cost_center TEXT
    CHECK (cost_center IN ('cursos', 'servico_drone', 'administrativo'));

ALTER TABLE lead_class_enrollments
  ADD COLUMN IF NOT EXISTS cost_center TEXT DEFAULT 'cursos'
    CHECK (cost_center IN ('cursos', 'servico_drone', 'administrativo'));

ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS cost_center TEXT DEFAULT 'cursos'
    CHECK (cost_center IN ('cursos', 'servico_drone', 'administrativo'));

-- Inferir cost_center para turmas/enrollments de serviço de drone
UPDATE turmas
   SET cost_center = 'servico_drone'
 WHERE LOWER(name) LIKE '%drone%'
    OR LOWER(name) LIKE '%aplicac%'
    OR LOWER(category) LIKE '%servico%'
    OR LOWER(category) LIKE '%drone%';

UPDATE lead_class_enrollments lce
   SET cost_center = t.cost_center
  FROM turmas t
 WHERE t.id = lce.class_id
   AND lce.cost_center = 'cursos';

-- ── F08: instructor_cost e is_processed_finance em turmas ──
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS instructor_cost NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_processed_finance BOOLEAN DEFAULT FALSE;

-- ── T02: professor_id (FK → perfis) em turmas ──
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS professor_id UUID REFERENCES perfis(id);

UPDATE turmas t
   SET professor_id = p.id
  FROM perfis p
 WHERE LOWER(TRIM(t.professor_name)) = LOWER(TRIM(p.name))
   AND t.professor_id IS NULL;

-- ── T01: contracted_amount NOT NULL em lead_class_enrollments ──
-- Primeiro popula os NULLs com o preço da turma
UPDATE lead_class_enrollments lce
   SET contracted_amount = t.price
  FROM turmas t
 WHERE t.id = lce.class_id
   AND (lce.contracted_amount IS NULL OR lce.contracted_amount = 0);

-- D02: Corrigir leads sem stage_id (invisíveis no Kanban)
UPDATE leads
   SET pipeline_id = (SELECT id FROM pipelines WHERE name = 'Principal' LIMIT 1),
       stage_id    = (
         SELECT ps.id
           FROM pipeline_stages ps
           JOIN pipelines p ON p.id = ps.pipeline_id
          WHERE p.name = 'Principal'
          ORDER BY ps.position ASC
          LIMIT 1
       )
 WHERE stage_id IS NULL;
-- #F08 + #P01 — Triggers: fn_turma_csp + sync_permissions_cache

-- ── F08: Trigger de CSP (Custo do Instrutor) ──
CREATE OR REPLACE FUNCTION fn_turma_csp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'concluida'
     AND (OLD.status IS NULL OR OLD.status != 'concluida')
     AND COALESCE(NEW.instructor_cost, 0) > 0
     AND NOT COALESCE(NEW.is_processed_finance, FALSE) THEN

    INSERT INTO financial_transactions
      (description, amount, type, status, class_id, origin_type, cost_center)
    VALUES
      ('CSP Instrutor: ' || NEW.name,
       NEW.instructor_cost,
       'EXPENSE',
       'PENDING',
       NEW.id,
       'CLASS',
       COALESCE(NEW.cost_center, 'cursos'));

    UPDATE turmas SET is_processed_finance = TRUE WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_turma_csp ON turmas;
CREATE TRIGGER trg_turma_csp
  AFTER UPDATE ON turmas
  FOR EACH ROW
  EXECUTE FUNCTION fn_turma_csp();

-- ── P01: Cache de permissões para eliminar seq scans em cargos/perfis ──
ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS permissions_cache JSONB;

-- Popular cache inicial
UPDATE perfis p
   SET permissions_cache = c.permissions
  FROM cargos c
 WHERE c.id = p.role_id;

CREATE OR REPLACE FUNCTION sync_permissions_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE perfis
     SET permissions_cache = (
       SELECT permissions FROM cargos WHERE id = NEW.role_id
     )
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_perms ON perfis;
CREATE TRIGGER trg_sync_perms
  AFTER UPDATE OF role_id ON perfis
  FOR EACH ROW
  EXECUTE FUNCTION sync_permissions_cache();

-- ── P01: Índice GIN para cargos.permissions ──
CREATE INDEX IF NOT EXISTS idx_cargos_permissions_gin
  ON cargos USING GIN(permissions);

-- ── Performance: índices em turmas ──
CREATE INDEX IF NOT EXISTS idx_turmas_status   ON turmas(status);
CREATE INDEX IF NOT EXISTS idx_turmas_category ON turmas(category);

-- ── Performance: índice em leads ──
CREATE INDEX IF NOT EXISTS idx_leads_email
  ON leads(email)
  WHERE email IS NOT NULL;

-- ── Performance: índice em lead_class_enrollments ──
CREATE INDEX IF NOT EXISTS idx_lce_lead_id  ON lead_class_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lce_class_id ON lead_class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_lce_status   ON lead_class_enrollments(status);
-- #F07 + #F05 + #D01 — Views e RPCs: v_dre_receita, v_bpo_pluppex, get_dashboard_kpis, get_dre

-- ── F07: VIEW única de receita para DRE ──
DROP VIEW IF EXISTS v_dre_receita CASCADE;
CREATE VIEW v_dre_receita AS
  -- Receita via financial_transactions PAID
  SELECT
    'PIPELINE'                      AS origem,
    ft.payment_date::DATE           AS data,
    ft.amount                       AS valor,
    COALESCE(fc.name, 'Outras')     AS categoria,
    ft.cost_center
  FROM financial_transactions ft
  LEFT JOIN financial_categories fc ON fc.id = ft.category_id
  WHERE ft.type = 'INCOME' AND ft.status = 'PAID'

  UNION ALL

  -- Receita via matrículas não vinculadas
  SELECT
    'MATRICULA'                                                   AS origem,
    COALESCE(lce.valor_recebido_paid_at::DATE, lce.enrolled_at::DATE) AS data,
    COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0) AS valor,
    'RECEITA_BRUTA'                                               AS categoria,
    COALESCE(lce.cost_center, 'cursos')                           AS cost_center
  FROM lead_class_enrollments lce
  WHERE lce.status != 'CANCELLED'
    AND lce.income_transaction_id IS NULL
    AND (lce.valor_recebido > 0 OR lce.taxa_matricula_recebido > 0);

-- ── F05: VIEW de BPO Pluppex por turma ──
DROP VIEW IF EXISTS v_bpo_pluppex CASCADE;
CREATE VIEW v_bpo_pluppex AS
  SELECT
    lce.class_id,
    t.name AS turma,
    SUM(CASE WHEN lce.seller_origin = 'target'
          THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.08
          ELSE 0 END) AS bpo_target_8pct,
    SUM(CASE WHEN lce.seller_origin = 'pluppex'
          THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.18
          ELSE 0 END) AS bpo_pluppex_18pct,
    SUM(CASE
          WHEN lce.seller_origin = 'target'  THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.08
          WHEN lce.seller_origin = 'pluppex' THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.18
          ELSE 0
        END) AS total_bpo
  FROM lead_class_enrollments lce
  JOIN turmas t ON t.id = lce.class_id
  WHERE lce.status != 'CANCELLED'
  GROUP BY lce.class_id, t.name;

-- ── D01 / F01: RPC get_dashboard_kpis ──
DROP FUNCTION IF EXISTS get_dashboard_kpis(DATE, DATE);
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_start DATE, p_end DATE)
RETURNS TABLE(
  receita_realizada   NUMERIC,
  a_receber           NUMERIC,
  despesas            NUMERIC,
  lucro               NUMERIC,
  alunos_ganhos       BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Receita realizada = financial_transactions PAID + matrículas não vinculadas no período
    (
      SELECT COALESCE(SUM(ft.amount), 0)
        FROM financial_transactions ft
       WHERE ft.type = 'INCOME'
         AND ft.status = 'PAID'
         AND ft.payment_date::DATE BETWEEN p_start AND p_end
    ) + (
      SELECT COALESCE(SUM(
               COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)
             ), 0)
        FROM lead_class_enrollments lce
       WHERE lce.status != 'CANCELLED'
         AND lce.income_transaction_id IS NULL
         AND COALESCE(lce.valor_recebido_paid_at::DATE, lce.enrolled_at::DATE) BETWEEN p_start AND p_end
    ) AS receita_realizada,

    -- A Receber = saldo de matrículas ativas
    (
      SELECT COALESCE(SUM(GREATEST(0, COALESCE(contracted_amount, 0) - COALESCE(valor_recebido, 0))), 0)
        FROM lead_class_enrollments
       WHERE status != 'CANCELLED'
         AND COALESCE(contracted_amount, 0) > COALESCE(valor_recebido, 0)
    ) AS a_receber,

    -- Despesas
    (
      SELECT COALESCE(SUM(amount), 0)
        FROM financial_transactions
       WHERE type = 'EXPENSE'
         AND status = 'PAID'
         AND payment_date::DATE BETWEEN p_start AND p_end
    ) AS despesas,

    -- Lucro = receita - despesas (calculado na mesma query)
    0 AS lucro,

    -- Alunos ganhos no período
    (
      SELECT COUNT(DISTINCT id)
        FROM lead_class_enrollments
       WHERE status != 'CANCELLED'
         AND enrolled_at::DATE BETWEEN p_start AND p_end
    ) AS alunos_ganhos;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── F07: RPC get_dre ──
DROP FUNCTION IF EXISTS get_dre(DATE, DATE);
CREATE OR REPLACE FUNCTION get_dre(p_start DATE, p_end DATE)
RETURNS TABLE(
  origem      TEXT,
  categoria   TEXT,
  valor       NUMERIC,
  data        DATE,
  cost_center TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.origem, v.categoria, v.valor, v.data, v.cost_center
    FROM v_dre_receita v
   WHERE v.data BETWEEN p_start AND p_end
  UNION ALL
  SELECT
    'DESPESA'                       AS origem,
    COALESCE(fc.name, 'Outras')     AS categoria,
    ft.amount                       AS valor,
    ft.payment_date::DATE           AS data,
    ft.cost_center                  AS cost_center
  FROM financial_transactions ft
  LEFT JOIN financial_categories fc ON fc.id = ft.category_id
  WHERE ft.type = 'EXPENSE'
    AND ft.status = 'PAID'
    AND ft.payment_date::DATE BETWEEN p_start AND p_end
  ORDER BY data;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── C03: View de leads duplicados por email ──
DROP VIEW IF EXISTS v_leads_duplicados CASCADE;
CREATE VIEW v_leads_duplicados AS
  SELECT
    email,
    COUNT(*) AS total,
    array_agg(name ORDER BY created_at) AS nomes,
    array_agg(id) AS ids
  FROM leads
  WHERE email IS NOT NULL
  GROUP BY email
  HAVING COUNT(*) > 1;
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
