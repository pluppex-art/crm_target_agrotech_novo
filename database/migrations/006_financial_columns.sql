-- Migration 006: Add financial tracking columns
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. seller_origin: identifies which squad sold the lead (target or pluppex)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS seller_origin TEXT CHECK (seller_origin IN ('target', 'pluppex'));

ALTER TABLE lead_class_enrollments
  ADD COLUMN IF NOT EXISTS seller_origin TEXT CHECK (seller_origin IN ('target', 'pluppex'));

-- 2. responsible_id: UUID FK to perfis (replaces fragile text-name matching in OTE)
ALTER TABLE lead_class_enrollments
  ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES perfis(id);

-- 3. cost_center: separates business lines for cash flow / DRE
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS cost_center TEXT CHECK (cost_center IN ('cursos', 'servico_drone', 'administrativo'));

ALTER TABLE lead_class_enrollments
  ADD COLUMN IF NOT EXISTS cost_center TEXT CHECK (cost_center IN ('cursos', 'servico_drone', 'administrativo'))
  DEFAULT 'cursos';

-- 4. instructor_cost and finance processing flag on turmas
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS instructor_cost NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_processed_finance BOOLEAN DEFAULT FALSE;

-- ============================================================
-- BACKFILL: populate responsible_id from name match
-- ============================================================
UPDATE lead_class_enrollments lce
SET responsible_id = p.id
FROM perfis p
WHERE LOWER(TRIM(lce.responsible)) = LOWER(TRIM(p.name))
  AND lce.responsible_id IS NULL
  AND lce.responsible IS NOT NULL;

-- ============================================================
-- BACKFILL: populate seller_origin on leads from squad membership
-- ============================================================
UPDATE leads l
SET seller_origin = CASE
  WHEN EXISTS (
    SELECT 1 FROM squad_members sm
    JOIN squads s ON sm.squad_id = s.id
    JOIN perfis p ON sm.user_id = p.id
    WHERE (
      LOWER(TRIM(p.name)) = LOWER(TRIM(l.responsible))
      OR sm.user_id = l.responsavel_usuario_id
    )
    AND UPPER(s.name) LIKE '%PLUPPEX%'
    AND sm.active = true
  ) THEN 'pluppex'
  ELSE 'target'
END
WHERE l.seller_origin IS NULL;

-- Propagate seller_origin to lead_class_enrollments
UPDATE lead_class_enrollments lce
SET seller_origin = l.seller_origin
FROM leads l
WHERE lce.lead_id = l.id
  AND lce.seller_origin IS NULL
  AND l.seller_origin IS NOT NULL;

-- ============================================================
-- VIEWS: unified revenue source for DRE and Dashboard
-- ============================================================
CREATE OR REPLACE VIEW v_dre_receita AS
SELECT
  'PIPELINE' AS origem,
  ft.payment_date::DATE AS data,
  ft.amount AS valor,
  ft.category_id,
  fc.dre_group,
  ft.cost_center
FROM financial_transactions ft
LEFT JOIN financial_categories fc ON ft.category_id = fc.id
WHERE ft.type = 'INCOME' AND ft.status = 'PAID'

UNION ALL

SELECT
  'MATRICULA' AS origem,
  COALESCE(lce.valor_recebido_paid_at::DATE, lce.enrolled_at::DATE) AS data,
  (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) AS valor,
  NULL AS category_id,
  'RECEITA_BRUTA' AS dre_group,
  COALESCE(lce.cost_center, 'cursos') AS cost_center
FROM lead_class_enrollments lce
WHERE lce.status != 'CANCELLED'
  AND lce.income_transaction_id IS NULL
  AND (lce.valor_recebido > 0 OR lce.taxa_matricula_recebido > 0);

-- View: BPO breakdown by class (Target 8% / Pluppex 18%)
CREATE OR REPLACE VIEW v_pluppex_bpo_by_class AS
SELECT
  lce.class_id,
  t.name AS turma_name,
  COUNT(*) FILTER (WHERE lce.seller_origin = 'target')   AS matriculas_target,
  COUNT(*) FILTER (WHERE lce.seller_origin = 'pluppex')  AS matriculas_pluppex,
  SUM(CASE WHEN lce.seller_origin = 'target'
    THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.08
    ELSE 0 END) AS bpo_target,
  SUM(CASE WHEN lce.seller_origin = 'pluppex'
    THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.18
    ELSE 0 END) AS bpo_pluppex,
  SUM(
    CASE WHEN lce.seller_origin = 'target'
      THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.08
      ELSE (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.18
    END
  ) AS total_bpo
FROM lead_class_enrollments lce
JOIN turmas t ON t.id = lce.class_id
WHERE lce.status != 'CANCELLED'
GROUP BY lce.class_id, t.name;
