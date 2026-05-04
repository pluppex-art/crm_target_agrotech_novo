-- 012_financial_transactions_audit_fields.sql
-- Fase 1 — Adiciona campos de auditoria de cancelamento em financial_transactions
-- e expande origin_type para aceitar REFUND.
-- NÃO DESTRUTIVO: nenhum dado existente é alterado, nenhuma tabela removida.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Novos campos de auditoria de cancelamento
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Expandir origin_type para incluir REFUND
--
-- PostgreSQL nomeia automaticamente CHECKs inline como:
--   {tabela}_{coluna}_check
-- O constraint original em 002_finance_transactions.sql é:
--   CHECK (origin_type IN ('MANUAL', 'PIPELINE', 'CLASS', 'COMMISSION', 'PARTNER'))
-- Portanto o nome gerado é: financial_transactions_origin_type_check
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_origin_type_check;

ALTER TABLE financial_transactions
  ADD CONSTRAINT financial_transactions_origin_type_check
  CHECK (origin_type IN ('MANUAL', 'PIPELINE', 'CLASS', 'COMMISSION', 'PARTNER', 'REFUND'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Índice para facilitar lookup de reembolsos vinculados a receitas
--    (complementa o source_transaction_id já indexado via idx_uniq_commission_expense)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fin_tx_refund
  ON financial_transactions(source_transaction_id)
  WHERE origin_type = 'REFUND';

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificação pós-migration
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_has_cancellation_reason BOOLEAN;
  v_has_cancelled_at        BOOLEAN;
  v_constraint_ok           BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions'
      AND column_name = 'cancellation_reason'
  ) INTO v_has_cancellation_reason;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions'
      AND column_name = 'cancelled_at'
  ) INTO v_has_cancelled_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name    = 'financial_transactions'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause LIKE '%REFUND%'
  ) INTO v_constraint_ok;

  RAISE NOTICE '012 — cancellation_reason adicionado : %', v_has_cancellation_reason;
  RAISE NOTICE '012 — cancelled_at adicionado        : %', v_has_cancelled_at;
  RAISE NOTICE '012 — origin_type aceita REFUND      : %', v_constraint_ok;
END;
$$;
