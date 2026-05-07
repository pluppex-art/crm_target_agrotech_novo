-- ============================================================
-- 006_data_migration_preview.sql  (v2)
-- APENAS LEITURA — NÃO FAZ INSERT.
-- Execute este SELECT no Supabase SQL Editor para validar
-- quais registros seriam migrados antes de rodar o INSERT.
--
-- DESCOBERTA: O campo leads.status é calculado em runtime
-- a partir do nome do stage. No banco, leads "ganhos" têm
-- stage_id apontando para stages cujo nome contém "ganho",
-- "aprovado", "fechado" ou "conclu". O campo status pode
-- conter qualquer valor no banco.
-- ============================================================

WITH
-- 0. Stages que representam "Ganho" (pelo nome, igual ao utils.ts do frontend)
ganho_stages AS (
    SELECT id AS stage_id, name AS stage_name
    FROM pipeline_stages
    WHERE lower(name) ILIKE '%ganho%'
       OR lower(name) ILIKE '%aprovado%'
       OR lower(name) ILIKE '%fechado%'
       OR lower(name) ILIKE '%conclu%'
),

-- 1. Leads nas stages de Ganho
leads_ganho AS (
    SELECT
        l.id                                                            AS lead_id,
        l.name                                                          AS lead_name,
        l.status                                                        AS status_campo_db,
        gs.stage_name                                                   AS stage_ganho,
        l.substatus,
        -- Valor: prioridade para valor_recebido; fallback para value
        CAST(
            NULLIF(regexp_replace(
                COALESCE(l.valor_recebido::text, l.value::text, '0'),
                '[^0-9.]', '', 'g'
            ), '')
        AS NUMERIC)                                                     AS amount,
        l.responsible,
        l.product,
        l.forma_pagamento,
        l.created_at,
        l.updated_at
    FROM leads l
    INNER JOIN ganho_stages gs ON gs.stage_id = l.stage_id
),

-- 2. Verifica quais leads JÁ têm entrada em financial_transactions
already_migrated AS (
    SELECT ft.lead_id
    FROM financial_transactions ft
    WHERE ft.origin_type IN ('PIPELINE', 'LEGACY_MIGRATION')
      AND ft.type = 'INCOME'
      AND ft.lead_id IS NOT NULL
),

-- 3. Resolve user_id a partir do campo responsible
profile_lookup AS (
    SELECT
        lower(trim(full_name)) AS name_key,
        id                     AS user_id
    FROM profiles
)

-- ─── PRÉVIA DETALHADA ────────────────────────────────────────
SELECT
    lg.lead_id,
    lg.lead_name,
    lg.status_campo_db,
    lg.stage_ganho,
    lg.substatus,
    lg.amount,
    lg.responsible,
    lg.forma_pagamento,
    lg.product,

    CASE WHEN am.lead_id IS NOT NULL THEN 'SIM ❌' ELSE 'NÃO ✅' END
        AS ja_existe_em_financial_transactions,

    CASE WHEN COALESCE(lg.amount, 0) <= 0 THEN 'SIM ❌ (ignorado)' ELSE 'NÃO ✅' END
        AS sem_valor,

    CASE
        WHEN lg.responsible IS NULL OR trim(lg.responsible) = '' THEN 'Sem responsável ⚠️'
        WHEN pl.user_id IS NOT NULL THEN 'Encontrado ✅'
        ELSE 'NÃO encontrado ❌ (' || lg.responsible || ')'
    END AS vendedor_status,

    CASE
        WHEN am.lead_id IS NOT NULL THEN 'IGNORAR — já migrado'
        WHEN COALESCE(lg.amount, 0) <= 0 THEN 'IGNORAR — sem valor'
        ELSE 'MIGRAR → INCOME | PENDING | PIPELINE'
    END AS acao_prevista,

    lg.created_at,
    lg.updated_at

FROM leads_ganho lg
LEFT JOIN already_migrated am ON am.lead_id = lg.lead_id
LEFT JOIN profile_lookup pl ON lower(trim(lg.responsible)) = pl.name_key
ORDER BY acao_prevista, lg.updated_at DESC;


-- ─── RESUMO AGREGADO ─────────────────────────────────────────
WITH
ganho_stages AS (
    SELECT id AS stage_id FROM pipeline_stages
    WHERE lower(name) ILIKE '%ganho%'
       OR lower(name) ILIKE '%aprovado%'
       OR lower(name) ILIKE '%fechado%'
       OR lower(name) ILIKE '%conclu%'
),
leads_ganho AS (
    SELECT
        l.id AS lead_id,
        l.responsible,
        CAST(NULLIF(regexp_replace(
            COALESCE(l.valor_recebido::text, l.value::text, '0'),
            '[^0-9.]', '', 'g'), '') AS NUMERIC) AS amount
    FROM leads l
    INNER JOIN ganho_stages gs ON gs.stage_id = l.stage_id
),
already_migrated AS (
    SELECT ft.lead_id FROM financial_transactions ft
    WHERE ft.origin_type IN ('PIPELINE', 'LEGACY_MIGRATION') AND ft.type = 'INCOME' AND ft.lead_id IS NOT NULL
),
profile_lookup AS (
    SELECT lower(trim(full_name)) AS name_key, id AS user_id FROM profiles
)
SELECT
    COUNT(*)                                                                          AS total_leads_ganho,
    COUNT(*) FILTER (WHERE am.lead_id IS NOT NULL)                                   AS ignorados_ja_existem,
    COUNT(*) FILTER (WHERE am.lead_id IS NULL AND COALESCE(lg.amount,0) <= 0)        AS ignorados_sem_valor,
    COUNT(*) FILTER (WHERE am.lead_id IS NULL AND lg.responsible IS NULL)            AS sem_vendedor,
    COUNT(*) FILTER (WHERE am.lead_id IS NULL AND COALESCE(lg.amount,0) > 0)        AS total_a_migrar,
    COALESCE(SUM(lg.amount) FILTER (WHERE am.lead_id IS NULL AND COALESCE(lg.amount,0) > 0), 0)
                                                                                     AS soma_total_a_migrar
FROM leads_ganho lg
LEFT JOIN already_migrated am ON am.lead_id = lg.lead_id
LEFT JOIN profile_lookup pl ON lower(trim(lg.responsible)) = pl.name_key;


