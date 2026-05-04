-- ============================================================
-- 006_data_migration_historical_sales.sql
-- MIGRATION REAL — CONTÉM INSERT.
-- ⚠️  SÓ EXECUTE APÓS VALIDAR 006_data_migration_preview.sql
-- ============================================================
--
-- ORDEM DE EXECUÇÃO OBRIGATÓRIA:
-- 1. Execute 006_data_migration_preview.sql → valide com o time
-- 2. Execute ESTE arquivo apenas após aprovação da prévia
-- 3. Confira o relatório gerado ao final (RAISE NOTICE)
--
-- O QUE ESTA MIGRATION FAZ:
-- • Insere receitas INCOME / PENDING / origin_type = PIPELINE
--   para leads 'closed' que ainda não existem em financial_transactions
-- • status = PENDING (não dispara trigger de comissão)
-- • Idempotente: ON CONFLICT DO NOTHING no índice parcial existente
-- • Gera relatório de execução ao final
--
-- O QUE NÃO FAZ:
-- • Não marca como PAID (você confirma depois, lead a lead ou via script)
-- • Não gera comissão automática (trigger só age em PAID)
-- • Não toca em leads já migrados
-- ============================================================

DO $$
DECLARE
    v_cat_curso_id       UUID;
    v_cat_servico_id     UUID;
    v_count_total        INT := 0;
    v_count_migrated     INT := 0;
    v_count_skipped_dup  INT := 0;
    v_count_skipped_val  INT := 0;
    v_count_no_seller    INT := 0;
    v_sum_migrated       NUMERIC := 0;

    -- cursor sobre os leads elegíveis
    rec RECORD;
    v_user_id       UUID;
    v_user_count    INT;
    v_amount        NUMERIC;
    v_category_id   UUID;
    v_description   TEXT;
    v_already_exists BOOLEAN;
BEGIN

    -- ── Resolve categorias ──────────────────────────────────
    SELECT id INTO v_cat_curso_id   FROM financial_categories WHERE name = 'Venda de Curso'   LIMIT 1;
    SELECT id INTO v_cat_servico_id FROM financial_categories WHERE name = 'Venda de Serviço' LIMIT 1;

    -- ── Loop nos leads nas stages de Ganho ─────────────────
    FOR rec IN
        SELECT
            l.id           AS lead_id,
            l.name         AS lead_name,
            l.status,
            l.substatus,
            l.responsible,
            l.product,
            l.forma_pagamento,
            l.updated_at,
            l.created_at,
            -- Valor: prioridade para valor_recebido; fallback para value
            CAST(
                NULLIF(regexp_replace(
                    COALESCE(l.valor_recebido::text, l.value::text, '0'),
                    '[^0-9.]', '', 'g'
                ), '')
            AS NUMERIC) AS amount
        FROM leads l
        INNER JOIN pipeline_stages ps ON ps.id = l.stage_id
        WHERE (lower(ps.name) ILIKE '%ganho%'
            OR lower(ps.name) ILIKE '%aprovado%'
            OR lower(ps.name) ILIKE '%fechado%'
            OR lower(ps.name) ILIKE '%conclu%')
        ORDER BY l.updated_at ASC
    LOOP
        v_count_total := v_count_total + 1;

        -- ── Verifica se já existe em financial_transactions ─
        SELECT EXISTS (
            SELECT 1 FROM financial_transactions
            WHERE lead_id = rec.lead_id
              AND type = 'INCOME'
              AND origin_type IN ('PIPELINE', 'LEGACY_MIGRATION')
        ) INTO v_already_exists;

        IF v_already_exists THEN
            v_count_skipped_dup := v_count_skipped_dup + 1;
            CONTINUE;
        END IF;

        -- ── Validação de valor ──────────────────────────────
        v_amount := COALESCE(rec.amount, 0);
        IF v_amount <= 0 THEN
            v_count_skipped_val := v_count_skipped_val + 1;
            CONTINUE;
        END IF;

        -- ── Resolve vendedor ────────────────────────────────
        v_user_id := NULL;
        IF rec.responsible IS NOT NULL AND trim(rec.responsible) != '' THEN
            SELECT COUNT(*) INTO v_user_count
            FROM profiles
            WHERE lower(trim(full_name)) = lower(trim(rec.responsible));

            IF v_user_count = 1 THEN
                SELECT id INTO v_user_id
                FROM profiles
                WHERE lower(trim(full_name)) = lower(trim(rec.responsible));
            END IF;
        END IF;

        IF v_user_id IS NULL THEN
            v_count_no_seller := v_count_no_seller + 1;
            -- Não interrompe — migra sem vendedor vinculado (user_id NULL)
        END IF;

        -- ── Resolve categoria ───────────────────────────────
        IF lower(COALESCE(rec.product, '')) LIKE '%serviço%'
        OR lower(COALESCE(rec.product, '')) LIKE '%servico%'
        OR lower(COALESCE(rec.product, '')) LIKE '%service%' THEN
            v_category_id := v_cat_servico_id;
        ELSE
            v_category_id := v_cat_curso_id;
        END IF;

        -- ── Monta descrição ─────────────────────────────────
        v_description := 'Receita Migrada - Lead: ' || rec.lead_name;
        IF rec.forma_pagamento IS NOT NULL AND trim(rec.forma_pagamento) != '' THEN
            v_description := v_description || ' | Pgto: ' || rec.forma_pagamento;
        END IF;

        -- ── INSERT idempotente ──────────────────────────────
        INSERT INTO financial_transactions (
            description,
            amount,
            type,
            status,          -- PENDING → não dispara trigger de comissão
            category_id,
            lead_id,
            user_id,
            origin_type,
            due_date,
            payment_date
        ) VALUES (
            v_description,
            v_amount,
            'INCOME',
            'PENDING',       -- ← IMPORTANTE: não PAID
            v_category_id,
            rec.lead_id,
            v_user_id,
            'PIPELINE',      -- Consistente com o índice parcial existente
            COALESCE(rec.updated_at::DATE, rec.created_at::DATE),
            NULL             -- payment_date fica NULL até confirmar pagamento
        )
        ON CONFLICT (lead_id)
        WHERE origin_type = 'PIPELINE' AND type = 'INCOME'
        DO NOTHING;

        -- Conta só se inseriu de fato
        IF FOUND THEN
            v_count_migrated := v_count_migrated + 1;
            v_sum_migrated   := v_sum_migrated + v_amount;
        ELSE
            -- ON CONFLICT DO NOTHING foi acionado (race condition ou duplicidade)
            v_count_skipped_dup := v_count_skipped_dup + 1;
        END IF;

    END LOOP;

    -- ── RELATÓRIO FINAL ─────────────────────────────────────
    RAISE NOTICE '══════════════════════════════════════════════════';
    RAISE NOTICE '   RELATÓRIO DE MIGRAÇÃO HISTÓRICA DE VENDAS';
    RAISE NOTICE '══════════════════════════════════════════════════';
    RAISE NOTICE 'Total de leads closed encontrados  : %', v_count_total;
    RAISE NOTICE 'Migrados com sucesso               : %', v_count_migrated;
    RAISE NOTICE '  └─ Soma total migrada (R$)       : %', v_sum_migrated;
    RAISE NOTICE 'Ignorados — já existiam            : %', v_count_skipped_dup;
    RAISE NOTICE 'Ignorados — sem valor (= R$0)      : %', v_count_skipped_val;
    RAISE NOTICE 'Migrados SEM vendedor vinculado    : %', v_count_no_seller;
    RAISE NOTICE '══════════════════════════════════════════════════';
    RAISE NOTICE 'STATUS DOS REGISTROS MIGRADOS      : PENDING';
    RAISE NOTICE 'Próximo passo: revisar e marcar PAID os confirmados';
    RAISE NOTICE '══════════════════════════════════════════════════';

END $$;


-- ── VERIFICAÇÃO PÓS-EXECUÇÃO ──────────────────────────────────
-- Execute logo após rodar o bloco acima para confirmar:

SELECT
    COUNT(*)                          AS total_migrados,
    SUM(amount)                       AS soma_total,
    COUNT(*) FILTER (WHERE user_id IS NULL)  AS sem_vendedor,
    MIN(due_date)                     AS data_mais_antiga,
    MAX(due_date)                     AS data_mais_recente
FROM financial_transactions
WHERE origin_type = 'PIPELINE'
  AND type = 'INCOME'
  AND status = 'PENDING'
  AND description LIKE 'Receita Migrada%';
