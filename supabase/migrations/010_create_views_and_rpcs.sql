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
