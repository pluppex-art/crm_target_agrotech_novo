-- 015_refund_category_seed.sql
-- Fase 1 — Cria a categoria financeira de sistema para reembolsos.
--
-- Justificativa do dre_group = DEDUCOES:
--   Reembolso é uma devolução de receita já reconhecida, não uma despesa operacional.
--   No DRE, aparece como dedução da Receita Bruta, igual a impostos e comissões.
--   Se cair em DESPESAS_OP, o Lucro Bruto fica artificialmente inflado.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO financial_categories (name, type, dre_group, is_system)
VALUES ('Reembolso a Cliente', 'EXPENSE', 'DEDUCOES', true)
ON CONFLICT (name) DO UPDATE
  SET
    type      = EXCLUDED.type,
    dre_group = EXCLUDED.dre_group,
    is_system = EXCLUDED.is_system,
    updated_at = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificação pós-migration
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_id        UUID;
  v_type      TEXT;
  v_dre_group TEXT;
  v_is_system BOOLEAN;
BEGIN
  SELECT id, type, dre_group, is_system
  INTO v_id, v_type, v_dre_group, v_is_system
  FROM financial_categories
  WHERE name = 'Reembolso a Cliente';

  IF v_id IS NULL THEN
    RAISE EXCEPTION '015 — ERRO: categoria "Reembolso a Cliente" não foi criada.';
  END IF;

  RAISE NOTICE '015 — Categoria "Reembolso a Cliente" : OK';
  RAISE NOTICE '015 —   id        : %', v_id;
  RAISE NOTICE '015 —   type      : % (esperado: EXPENSE)  → %', v_type,      (v_type = 'EXPENSE');
  RAISE NOTICE '015 —   dre_group : % (esperado: DEDUCOES) → %', v_dre_group, (v_dre_group = 'DEDUCOES');
  RAISE NOTICE '015 —   is_system : % (esperado: true)     → %', v_is_system, v_is_system;
END;
$$;
