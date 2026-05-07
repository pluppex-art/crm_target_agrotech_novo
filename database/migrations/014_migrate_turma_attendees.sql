-- 014_migrate_turma_attendees.sql
-- Fase 1 — Migra registros históricos de turma_attendees para lead_class_enrollments.
-- NÃO DESTRUTIVO: turma_attendees não é alterada ou removida.
--
-- Regras de migração:
--   1. Apenas registros com lead_id preenchido são migrados (sem lead = sem vínculo rastreável).
--   2. Usa NOT EXISTS para evitar duplicidade com a constraint de matrícula ativa.
--   3. Mapeia status legado → novo status:
--        matriculado → ENROLLED
--        confirmado  → CONFIRMED
--        indeciso    → ENROLLED   (equivalente mais próximo)
--        cancelado   → CANCELLED
--   4. contracted_amount = turma_attendees.vendas (campo de valor da matrícula legado).
--   5. enrolled_at não existe no legado — usa created_at como aproximação.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Contagem antes da migração (para relatório)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_total          INT;
  v_com_lead       INT;
  v_sem_lead       INT;
  v_cancelados     INT;
  v_ja_existentes  INT;
BEGIN
  SELECT COUNT(*)                                    INTO v_total        FROM turma_attendees;
  SELECT COUNT(*) FILTER (WHERE lead_id IS NOT NULL) INTO v_com_lead     FROM turma_attendees;
  SELECT COUNT(*) FILTER (WHERE lead_id IS NULL)     INTO v_sem_lead     FROM turma_attendees;
  SELECT COUNT(*) FILTER (WHERE status = 'cancelado' AND lead_id IS NOT NULL) INTO v_cancelados FROM turma_attendees;

  SELECT COUNT(*) INTO v_ja_existentes
  FROM turma_attendees ta
  WHERE ta.lead_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM lead_class_enrollments lce
      WHERE lce.lead_id  = ta.lead_id
        AND lce.class_id = ta.turma_id
        AND lce.status IN ('ENROLLED', 'CONFIRMED')
    );

  RAISE NOTICE '014 PRÉ-MIGRAÇÃO ─────────────────────────────';
  RAISE NOTICE '014 — Total de registros em turma_attendees : %', v_total;
  RAISE NOTICE '014 — Com lead_id preenchido                : %', v_com_lead;
  RAISE NOTICE '014 — Sem lead_id (serão ignorados)         : %', v_sem_lead;
  RAISE NOTICE '014 — Cancelados com lead_id                : %', v_cancelados;
  RAISE NOTICE '014 — Já existem em lead_class_enrollments  : %', v_ja_existentes;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Migração
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO lead_class_enrollments (
  lead_id,
  class_id,
  status,
  enrolled_at,
  removed_at,
  contracted_amount,
  notes
)
SELECT
  ta.lead_id,
  ta.turma_id,

  CASE ta.status
    WHEN 'matriculado' THEN 'ENROLLED'
    WHEN 'confirmado'  THEN 'CONFIRMED'
    WHEN 'indeciso'    THEN 'ENROLLED'
    WHEN 'cancelado'   THEN 'CANCELLED'
    ELSE                    'ENROLLED'
  END AS status,

  -- enrolled_at: usa created_at do registro legado como melhor aproximação
  COALESCE(ta.created_at, NOW()) AS enrolled_at,

  -- removed_at: preenchido apenas se cancelado
  CASE WHEN ta.status = 'cancelado' THEN ta.created_at ELSE NULL END AS removed_at,

  -- valor contratado na matrícula
  NULLIF(ta.vendas, 0) AS contracted_amount,

  -- nota indicando que veio da migração
  'Migrado de turma_attendees (legado)' AS notes

FROM turma_attendees ta

-- Apenas registros com vínculo de lead
WHERE ta.lead_id IS NOT NULL

-- Evita conflito com matrícula ativa já existente no destino:
-- se já existe um registro ENROLLED ou CONFIRMED para este lead+turma, pula.
-- Para cancelados, insere sempre (pode existir cancelado + novo enrollment ativo).
AND NOT (
  ta.status IN ('matriculado', 'confirmado', 'indeciso')
  AND EXISTS (
    SELECT 1
    FROM lead_class_enrollments lce
    WHERE lce.lead_id  = ta.lead_id
      AND lce.class_id = ta.turma_id
      AND lce.status IN ('ENROLLED', 'CONFIRMED')
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Relatório pós-migração
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_total_lce          INT;
  v_migrados_enrolled  INT;
  v_migrados_confirmed INT;
  v_migrados_cancelled INT;
  v_sem_lead_origem    INT;
  v_ignorados          INT;
  v_total_origem       INT;
BEGIN
  SELECT COUNT(*) INTO v_total_lce FROM lead_class_enrollments;

  SELECT COUNT(*) INTO v_migrados_enrolled
  FROM lead_class_enrollments
  WHERE status = 'ENROLLED' AND notes = 'Migrado de turma_attendees (legado)';

  SELECT COUNT(*) INTO v_migrados_confirmed
  FROM lead_class_enrollments
  WHERE status = 'CONFIRMED' AND notes = 'Migrado de turma_attendees (legado)';

  SELECT COUNT(*) INTO v_migrados_cancelled
  FROM lead_class_enrollments
  WHERE status = 'CANCELLED' AND notes = 'Migrado de turma_attendees (legado)';

  SELECT COUNT(*) FILTER (WHERE lead_id IS NULL) INTO v_sem_lead_origem FROM turma_attendees;
  SELECT COUNT(*) INTO v_total_origem FROM turma_attendees WHERE lead_id IS NOT NULL;

  -- Ignorados por duplicidade = total com lead - o que foi efetivamente inserido desta migration
  v_ignorados := v_total_origem - (v_migrados_enrolled + v_migrados_confirmed + v_migrados_cancelled);

  RAISE NOTICE '014 PÓS-MIGRAÇÃO ─────────────────────────────';
  RAISE NOTICE '014 — Total em lead_class_enrollments agora    : %', v_total_lce;
  RAISE NOTICE '014 — Migrados como ENROLLED (matriculado/indeciso): %', v_migrados_enrolled;
  RAISE NOTICE '014 — Migrados como CONFIRMED (confirmado)     : %', v_migrados_confirmed;
  RAISE NOTICE '014 — Migrados como CANCELLED (cancelado)      : %', v_migrados_cancelled;
  RAISE NOTICE '014 — Ignorados por duplicidade de matrícula ativa: %', v_ignorados;
  RAISE NOTICE '014 — Ignorados por ausência de lead_id        : %', v_sem_lead_origem;
END;
$$;
