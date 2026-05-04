-- ============================================================
-- 011_remediate_migrated_transactions.sql
-- Corrige os 31 registros migrados pela migration 006:
--
-- 1. Vincula user_id via perfis.name (não profiles.full_name)
-- 2. Para leads com valor_recebido > 0 → atualiza para PAID + payment_date
-- 3. Para leads com saldo restante (value > valor_recebido) → cria 
--    uma segunda transação PENDING com o valor a receber
-- ============================================================

-- ─── PASSO 1: Vincular vendedores via perfis.name ────────────────────────────
-- 
-- PRÉVIA: rode esta query primeiro para ver quantos serão vinculados
SELECT
    ft.id,
    ft.description,
    ft.amount,
    ft.user_id AS user_id_atual,
    l.responsible,
    p.id AS perfil_encontrado,
    p.name AS nome_perfil
FROM financial_transactions ft
INNER JOIN leads l ON l.id = ft.lead_id
LEFT JOIN perfis p ON lower(trim(p.name)) = lower(trim(l.responsible))
WHERE ft.description LIKE 'Receita Migrada%'
  AND ft.origin_type = 'PIPELINE'
  AND ft.type = 'INCOME'
ORDER BY p.id NULLS LAST;

-- ─── EXECUTE DEPOIS DE VALIDAR A PRÉVIA ACIMA ────────────────────────────────

-- ATUALIZAÇÃO 1: Vincula user_id para todos os registros migrados
UPDATE financial_transactions ft
SET
    user_id    = p.id,
    updated_at = NOW()
FROM leads l
INNER JOIN perfis p ON lower(trim(p.name)) = lower(trim(l.responsible))
WHERE ft.lead_id = l.id
  AND ft.description LIKE 'Receita Migrada%'
  AND ft.origin_type = 'PIPELINE'
  AND ft.type = 'INCOME'
  AND ft.user_id IS NULL;

-- Verifica quantos foram vinculados
SELECT
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS com_vendedor,
    COUNT(*) FILTER (WHERE user_id IS NULL)     AS sem_vendedor
FROM financial_transactions
WHERE description LIKE 'Receita Migrada%'
  AND origin_type = 'PIPELINE'
  AND type = 'INCOME';


-- ─── PASSO 2: Marcar como PAID onde valor_recebido > 0 ──────────────────────
--
-- Lógica:
--   valor_recebido > 0 → transação já foi paga → PAID + payment_date
--   O amount da transação JÁ usa valor_recebido como prioridade (da migration 006)
--   Então apenas mudamos o status e preenchemos payment_date

-- PRÉVIA do que seria marcado como PAID:
SELECT
    ft.id,
    ft.description,
    ft.amount          AS valor_transacao,
    l.valor_recebido   AS valor_recebido_lead,
    l.updated_at::DATE AS data_pagamento_estimada
FROM financial_transactions ft
INNER JOIN leads l ON l.id = ft.lead_id
WHERE ft.description LIKE 'Receita Migrada%'
  AND ft.origin_type = 'PIPELINE'
  AND ft.type = 'INCOME'
  AND ft.status = 'PENDING'
  AND COALESCE(l.valor_recebido, 0) > 0;

-- ATUALIZAÇÃO 2: Marcar como PAID
UPDATE financial_transactions ft
SET
    status       = 'PAID',
    payment_date = COALESCE(l.updated_at::DATE, l.created_at::DATE),
    updated_at   = NOW()
FROM leads l
WHERE ft.lead_id = l.id
  AND ft.description LIKE 'Receita Migrada%'
  AND ft.origin_type = 'PIPELINE'
  AND ft.type = 'INCOME'
  AND ft.status = 'PENDING'
  AND COALESCE(l.valor_recebido, 0) > 0;


-- ─── PASSO 3: Criar transação PENDING para saldo a receber ──────────────────
--
-- Condição: o lead tem valor total (value) maior que valor_recebido
-- Isso representa o que ainda falta pagar (ex: parcelamentos, segunda entrada)
--
-- PRÉVIA do saldo restante:
SELECT
    l.id           AS lead_id,
    l.name         AS lead_name,
    l.responsible,
    CAST(NULLIF(regexp_replace(l.value::text, '[^0-9.]', '', 'g'), '') AS NUMERIC) AS valor_contrato,
    COALESCE(l.valor_recebido, 0) AS valor_recebido,
    CAST(NULLIF(regexp_replace(l.value::text, '[^0-9.]', '', 'g'), '') AS NUMERIC)
        - COALESCE(l.valor_recebido, 0) AS saldo_pendente
FROM leads l
INNER JOIN pipeline_stages ps ON ps.id = l.stage_id
LEFT JOIN financial_transactions ft ON ft.lead_id = l.id
    AND ft.description LIKE 'Saldo a Receber%'
    AND ft.origin_type = 'PIPELINE'
WHERE (lower(ps.name) ILIKE '%ganho%'
    OR lower(ps.name) ILIKE '%aprovado%'
    OR lower(ps.name) ILIKE '%fechado%'
    OR lower(ps.name) ILIKE '%conclu%')
  AND COALESCE(l.valor_recebido, 0) > 0
  AND (CAST(NULLIF(regexp_replace(l.value::text, '[^0-9.]', '', 'g'), '') AS NUMERIC)
       - COALESCE(l.valor_recebido, 0)) > 0
  AND ft.id IS NULL  -- não existir já um saldo pendente
ORDER BY saldo_pendente DESC;

-- INSERÇÃO: Criar transações PENDING de saldo a receber
INSERT INTO financial_transactions (
    description,
    amount,
    type,
    status,
    category_id,
    lead_id,
    user_id,
    origin_type,
    due_date,
    payment_date
)
SELECT
    'Saldo a Receber - Lead: ' || l.name AS description,
    CAST(NULLIF(regexp_replace(l.value::text, '[^0-9.]', '', 'g'), '') AS NUMERIC)
        - COALESCE(l.valor_recebido, 0)  AS amount,
    'INCOME',
    'PENDING',
    (SELECT id FROM financial_categories WHERE name = 'Venda de Curso' LIMIT 1),
    l.id,
    p.id,  -- user_id via perfis
    'MANUAL',   -- MANUAL evita conflito com idx_uniq_pipeline_income
    COALESCE(l.updated_at::DATE, l.created_at::DATE),
    NULL
FROM leads l
INNER JOIN pipeline_stages ps ON ps.id = l.stage_id
LEFT JOIN perfis p ON lower(trim(p.name)) = lower(trim(l.responsible))
LEFT JOIN financial_transactions ft ON ft.lead_id = l.id
    AND ft.description LIKE 'Saldo a Receber%'
    AND ft.origin_type = 'MANUAL'   -- ← MANUAL para não conflitar com índice PIPELINE
WHERE (lower(ps.name) ILIKE '%ganho%'
    OR lower(ps.name) ILIKE '%aprovado%'
    OR lower(ps.name) ILIKE '%fechado%'
    OR lower(ps.name) ILIKE '%conclu%')
  AND COALESCE(l.valor_recebido, 0) > 0
  AND (CAST(NULLIF(regexp_replace(l.value::text, '[^0-9.]', '', 'g'), '') AS NUMERIC)
       - COALESCE(l.valor_recebido, 0)) > 0
  AND ft.id IS NULL;  -- idempotente: não duplica


-- ─── RELATÓRIO FINAL ─────────────────────────────────────────────────────────
SELECT
    COUNT(*)                                          AS total_transacoes,
    COUNT(*) FILTER (WHERE status = 'PAID')           AS pagas,
    COUNT(*) FILTER (WHERE status = 'PENDING')        AS pendentes,
    COUNT(*) FILTER (WHERE user_id IS NULL)           AS sem_vendedor,
    SUM(amount) FILTER (WHERE status = 'PAID')        AS total_recebido,
    SUM(amount) FILTER (WHERE status = 'PENDING')     AS total_a_receber,
    SUM(amount)                                       AS total_geral
FROM financial_transactions
WHERE type = 'INCOME'
  AND (description LIKE 'Receita Migrada%' OR description LIKE 'Saldo a Receber%');
