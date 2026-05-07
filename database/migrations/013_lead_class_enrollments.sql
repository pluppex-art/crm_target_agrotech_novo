-- 013_lead_class_enrollments.sql
-- Fase 1 — Cria a tabela lead_class_enrollments como nova fonte operacional de matrícula.
-- Substitui gradualmente turma_attendees (que permanece intacta nesta fase).
-- NÃO DESTRUTIVO: turma_attendees não é alterada ou removida.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabela principal
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_class_enrollments (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Vínculos obrigatórios
  -- ON DELETE RESTRICT: impede remover lead ou turma enquanto houver matrícula registrada.
  lead_id               UUID        NOT NULL REFERENCES leads(id)  ON DELETE RESTRICT,
  class_id              UUID        NOT NULL REFERENCES turmas(id) ON DELETE RESTRICT,

  -- Ciclo de vida da matrícula
  status                TEXT        NOT NULL DEFAULT 'ENROLLED'
    CHECK (status IN ('ENROLLED', 'CONFIRMED', 'TRANSFERRED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),

  -- Timestamps do ciclo de vida (preenchidos conforme transições de status)
  enrolled_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at          TIMESTAMPTZ,
  removed_at            TIMESTAMPTZ,    -- preenchido em CANCELLED, TRANSFERRED, NO_SHOW
  completed_at          TIMESTAMPTZ,

  -- Transferência: mantém histórico de para onde o aluno foi
  transfer_to_class_id  UUID        REFERENCES turmas(id) ON DELETE SET NULL,
  transferred_at        TIMESTAMPTZ,

  -- Cancelamento
  cancellation_reason   TEXT,

  -- Reembolso associado a este cancelamento (NONE por padrão)
  refund_status         TEXT        NOT NULL DEFAULT 'NONE'
    CHECK (refund_status IN ('NONE', 'PARTIAL', 'FULL')),

  -- Snapshot do valor contratado nesta matrícula específica
  -- (pode diferir do lead.value quando há descontos ou cursos adicionais)
  contracted_amount     NUMERIC(12,2),

  -- Rastreabilidade: transação de receita gerada quando este enrollment foi criado
  -- Permite que enrollmentService navegue direto para a transação correspondente
  income_transaction_id UUID        REFERENCES financial_transactions(id) ON DELETE SET NULL,

  -- Observações livres (ex: motivo de cancelamento sem impacto financeiro, contato, etc.)
  notes                 TEXT,

  -- Auditoria
  created_by            UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Índices
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lce_lead_id
  ON lead_class_enrollments(lead_id);

CREATE INDEX IF NOT EXISTS idx_lce_class_id
  ON lead_class_enrollments(class_id);

CREATE INDEX IF NOT EXISTS idx_lce_status
  ON lead_class_enrollments(status);

CREATE INDEX IF NOT EXISTS idx_lce_income_transaction_id
  ON lead_class_enrollments(income_transaction_id)
  WHERE income_transaction_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Constraint de unicidade de matrícula ativa
--
-- Impede que o mesmo lead apareça duas vezes na mesma turma com status ativo.
-- Status TRANSFERRED, CANCELLED, COMPLETED e NO_SHOW ficam fora do índice:
-- um aluno pode ser rematriculado após cancelamento ou completar outra edição.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_lce_unique_active_enrollment
  ON lead_class_enrollments(lead_id, class_id)
  WHERE status IN ('ENROLLED', 'CONFIRMED');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger: atualiza updated_at automaticamente
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_lce_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lce_updated_at ON lead_class_enrollments;

CREATE TRIGGER trg_lce_updated_at
  BEFORE UPDATE ON lead_class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION fn_lce_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS — sem policy de DELETE (remoção física proibida por design)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE lead_class_enrollments ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar matrículas
DROP POLICY IF EXISTS "lce_select_authenticated" ON lead_class_enrollments;
CREATE POLICY "lce_select_authenticated"
  ON lead_class_enrollments FOR SELECT
  TO authenticated
  USING (true);

-- Criação: usuário autenticado pode registrar matrícula
DROP POLICY IF EXISTS "lce_insert_authenticated" ON lead_class_enrollments;
CREATE POLICY "lce_insert_authenticated"
  ON lead_class_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Atualização: usuário autenticado pode mudar status/dados da matrícula
DROP POLICY IF EXISTS "lce_update_authenticated" ON lead_class_enrollments;
CREATE POLICY "lce_update_authenticated"
  ON lead_class_enrollments FOR UPDATE
  TO authenticated
  USING (true);

-- Sem policy de DELETE: nunca remover registros de matrícula.

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificação pós-migration
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_table_exists     BOOLEAN;
  v_unique_idx       BOOLEAN;
  v_trigger_exists   BOOLEAN;
  v_rls_enabled      BOOLEAN;
  v_delete_policy    BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'lead_class_enrollments'
  ) INTO v_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'lead_class_enrollments'
      AND indexname  = 'idx_lce_unique_active_enrollment'
  ) INTO v_unique_idx;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'lead_class_enrollments'
      AND trigger_name = 'trg_lce_updated_at'
  ) INTO v_trigger_exists;

  SELECT relrowsecurity
  FROM pg_class
  WHERE relname = 'lead_class_enrollments'
  INTO v_rls_enabled;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lead_class_enrollments'
      AND cmd = 'DELETE'
  ) INTO v_delete_policy;

  RAISE NOTICE '013 — tabela criada                  : %', v_table_exists;
  RAISE NOTICE '013 — unique parcial ativa            : %', v_unique_idx;
  RAISE NOTICE '013 — trigger updated_at              : %', v_trigger_exists;
  RAISE NOTICE '013 — RLS habilitado                  : %', v_rls_enabled;
  RAISE NOTICE '013 — policy DELETE presente (esperado false): %', v_delete_policy;
END;
$$;
