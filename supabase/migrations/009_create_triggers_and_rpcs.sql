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
