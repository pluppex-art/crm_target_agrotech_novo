-- 020_fix_turma_conclusion_financial_bug.sql
--
-- Bug reportado: clicar em "Concluir Turma" não fazia nada (o status da
-- turma não mudava) e um erro aparecia.
--
-- Causa raiz encontrada na produção (não estava documentada em nenhuma
-- migration do repositório — foi aplicada por fora em algum momento):
--
--   A tabela financial_transactions tem DUAS constraints CHECK diferentes
--   e conflitantes sobre a coluna origin_type:
--     - ck_fin_tx_origin              -> permite apenas
--                                        MANUAL, PIPELINE, COMMISSION, ENROLLMENT
--     - financial_transactions_origin_type_check -> permite
--                                        MANUAL, PIPELINE, CLASS, COMMISSION, PARTNER, REFUND
--
--   Como as duas precisam ser satisfeitas (AND), e 'CLASS' só existe na
--   segunda, todo INSERT com origin_type = 'CLASS' sempre falhava.
--   É exatamente o que a trigger de "CSP do instrutor" (disparada ao
--   marcar uma turma como concluída, quando ela tem instructor_cost > 0)
--   tenta inserir. Resultado: a trigger falhava, a transação inteira do
--   UPDATE em `turmas` era desfeita, e o status nunca era salvo.
--   Confirmado: 14 turmas em produção têm instructor_cost > 0, e nenhuma
--   transação com origin_type = 'CLASS' jamais existiu na tabela.
--
--   O mesmo padrão de conflito existe entre ck_fin_tx_status (não inclui
--   'OVERDUE') e financial_transactions_status_check (inclui). A tela de
--   Financeiro já expõe "Atrasada"/OVERDUE como status possível, então
--   corrigimos aqui também antes que vire o mesmo tipo de bug.
--
--   Além disso, existiam DUAS triggers fazendo o mesmo lançamento de CSP
--   (trg_turma_csp -> fn_turma_csp E trg_turma_to_csp -> fn_turma_to_csp),
--   sobrepostas por acidente histórico. Consolidamos em uma só.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1) Remover as constraints CHECK antigas/erradas que conflitam com as
--    corretas (mais completas) já existentes.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS ck_fin_tx_origin;
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS ck_fin_tx_status;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2) Consolidar as triggers de CSP do instrutor em uma só função,
--    marcada SECURITY DEFINER — o lançamento financeiro automático ao
--    concluir uma turma é uma automação do sistema e não deve depender
--    de quem clicou no botão ter permissão de finance.create.
-- ──────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_turma_csp ON turmas;
DROP FUNCTION IF EXISTS fn_turma_csp();

CREATE OR REPLACE FUNCTION fn_turma_to_csp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
BEGIN
  IF NEW.status = 'concluida'
     AND OLD.status IS DISTINCT FROM 'concluida'
     AND COALESCE(NEW.instructor_cost, 0) > 0
     AND COALESCE(NEW.is_processed_finance, false) = false
  THEN
    SELECT id INTO v_category_id
    FROM financial_categories
    WHERE dre_group = 'CSP'
      AND type = 'EXPENSE'
    ORDER BY (name ILIKE '%Instrutor%') DESC
    LIMIT 1;

    INSERT INTO financial_transactions (
      description,
      amount,
      type,
      status,
      category_id,
      class_id,
      due_date,
      origin_type,
      cost_center
    )
    VALUES (
      'CSP - Instrutor: ' || NEW.name,
      NEW.instructor_cost,
      'EXPENSE',
      'PENDING',
      v_category_id,
      NEW.id,
      CURRENT_DATE,
      'CLASS',
      'cursos'
    );

    NEW.is_processed_finance := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recria a trigger BEFORE apontando para a função atualizada (idempotente).
DROP TRIGGER IF EXISTS trg_turma_to_csp ON turmas;
CREATE TRIGGER trg_turma_to_csp
  BEFORE UPDATE ON turmas
  FOR EACH ROW
  EXECUTE FUNCTION fn_turma_to_csp();
