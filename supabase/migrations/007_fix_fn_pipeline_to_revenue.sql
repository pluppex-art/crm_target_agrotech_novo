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
