-- Migration: Sync existing concluded classes and cancelled attendees to their correct pipeline stages
-- Run this in your Supabase SQL Editor to retroactively update all historical leads.

DO $$
DECLARE
    v_turma_concluida_stage_id UUID;
    v_nao_compareceu_stage_id UUID;
    v_ganho_stage_id UUID;
    v_updated_concluded_count INT := 0;
    v_updated_cancelled_count INT := 0;
    v_cleanup_concluded_count INT := 0;
    v_cleanup_cancelled_count INT := 0;
    v_general_cancelled_count INT := 0;
BEGIN
    -- 1. Buscar a etapa "Turma Concluido" de forma resiliente
    SELECT id INTO v_turma_concluida_stage_id
    FROM pipeline_stages
    WHERE (name ILIKE '%Turma Conclu%' OR name ILIKE '%Conclu%')
      AND is_active = true
    ORDER BY position ASC
    LIMIT 1;

    -- 2. Buscar a etapa "Nao Compareceu" de forma resiliente
    SELECT id INTO v_nao_compareceu_stage_id
    FROM pipeline_stages
    WHERE (name ILIKE '%Não Compareceu%' OR name ILIKE '%Nao Compareceu%' OR name ILIKE '%Compareceu%')
      AND is_active = true
    ORDER BY position ASC
    LIMIT 1;

    -- 3. Buscar a etapa "Ganho" de forma resiliente (Fallback para '5037eedc-3b9f-471f-ad90-95010a228998')
    SELECT id INTO v_ganho_stage_id
    FROM pipeline_stages
    WHERE name ILIKE '%Ganho%'
      AND is_active = true
    ORDER BY position ASC
    LIMIT 1;

    IF v_ganho_stage_id IS NULL THEN
        v_ganho_stage_id := '5037eedc-3b9f-471f-ad90-95010a228998';
    END IF;

    -- 4. Atualizar leads de turmas concluídas antigas
    IF v_turma_concluida_stage_id IS NOT NULL AND v_nao_compareceu_stage_id IS NOT NULL THEN
        -- A) Alunos CONFIRMADOS de turmas concluídas vão para "Turma Concluída"
        WITH updated_confirmed AS (
            UPDATE leads l
            SET stage_id = v_turma_concluida_stage_id,
                substatus = 'Turma Concluída'
            FROM lead_class_enrollments e
            JOIN turmas t ON e.class_id = t.id
            WHERE e.lead_id = l.id
              AND t.status = 'concluida'
              AND e.board_status = 'confirmado'
              AND e.status <> 'CANCELLED'
            RETURNING l.id
        )
        SELECT COUNT(*) INTO v_updated_concluded_count FROM updated_confirmed;

        -- B) Alunos CANCELADOS (absentes que não compareceram) de turmas concluídas vão para "Não Compareceu"
        -- IMPORTANTE: Apenas se board_status = 'cancelado' e status <> 'CANCELLED'
        WITH updated_cancelled AS (
            UPDATE leads l
            SET stage_id = v_nao_compareceu_stage_id,
                substatus = 'Não Compareceu'
            FROM lead_class_enrollments e
            JOIN turmas t ON e.class_id = t.id
            WHERE e.lead_id = l.id
              AND t.status = 'concluida'
              AND e.board_status = 'cancelado'
              AND e.status <> 'CANCELLED'
              -- Evita mover quem tem alguma outra matrícula confirmada ativa na mesma ou em outra turma concluída
              AND NOT EXISTS (
                SELECT 1 
                FROM lead_class_enrollments e2
                JOIN turmas t2 ON e2.class_id = t2.id
                WHERE e2.lead_id = l.id
                  AND t2.status = 'concluida'
                  AND e2.board_status = 'confirmado'
                  AND e2.status <> 'CANCELLED'
              )
            RETURNING l.id
        )
        SELECT COUNT(*) INTO v_updated_cancelled_count FROM updated_cancelled;
        
        -- C) Limpar a etapa "Turma Concluido": Qualquer lead que está lá, mas NÃO possui 
        -- nenhuma matrícula ativa confirmada em turma concluída, deve ser movido para "Ganho"
        WITH cleanup_concluded AS (
            UPDATE leads l
            SET stage_id = v_ganho_stage_id,
                substatus = NULL
            WHERE l.stage_id = v_turma_concluida_stage_id
              AND NOT EXISTS (
                SELECT 1
                FROM lead_class_enrollments e
                JOIN turmas t ON e.class_id = t.id
                WHERE e.lead_id = l.id
                  AND t.status = 'concluida'
                  AND e.board_status = 'confirmado'
                  AND e.status <> 'CANCELLED'
              )
            RETURNING l.id
        )
        SELECT COUNT(*) INTO v_cleanup_concluded_count FROM cleanup_concluded;

        -- D) Limpar a etapa "Não Compareceu": Qualquer lead que está lá, mas NÃO possui 
        -- nenhuma matrícula cancelada (board_status = 'cancelado' e status <> 'CANCELLED') em turma concluída ou geral,
        -- deve ser movido de volta para "Ganho"
        WITH cleanup_cancelled AS (
            UPDATE leads l
            SET stage_id = v_ganho_stage_id,
                substatus = NULL
            WHERE l.stage_id = v_nao_compareceu_stage_id
              AND NOT EXISTS (
                SELECT 1
                FROM lead_class_enrollments e
                WHERE e.lead_id = l.id
                  AND e.board_status = 'cancelado'
                  AND e.status <> 'CANCELLED'
              )
            RETURNING l.id
        )
        SELECT COUNT(*) INTO v_cleanup_cancelled_count FROM cleanup_cancelled;

        RAISE NOTICE 'Leads atualizados para Turma Concluída (confirmados): %', v_updated_concluded_count;
        RAISE NOTICE 'Leads de turmas concluídas (cancelados/não compareceram) movidos para Não Compareceu: %', v_updated_cancelled_count;
        RAISE NOTICE 'Leads incorretos limpos de Turma Concluída e movidos para Ganho: %', v_cleanup_concluded_count;
        RAISE NOTICE 'Leads matriculados/cancelados incorretos limpos de Não Compareceu e movidos para Ganho: %', v_cleanup_cancelled_count;
    ELSE
        RAISE NOTICE 'Etapa "Turma Concluída" ou "Não Compareceu" não encontrada.';
    END IF;

    -- 5. Atualizar leads de alunos cancelados gerais (de turmas agendadas ou em andamento) para "Não Compareceu"
    -- Apenas se o board_status for 'cancelado' e status <> 'CANCELLED' (de fato não compareceram)
    IF v_nao_compareceu_stage_id IS NOT NULL THEN
        WITH updated_general_cancelled AS (
            UPDATE leads l
            SET stage_id = v_nao_compareceu_stage_id,
                substatus = 'Não Compareceu'
            FROM lead_class_enrollments e
            WHERE e.lead_id = l.id
              AND e.board_status = 'cancelado'
              AND e.status <> 'CANCELLED'
              AND l.stage_id <> v_nao_compareceu_stage_id
              -- Evita mover quem tem alguma outra matrícula confirmada ativa
              AND NOT EXISTS (
                SELECT 1 
                FROM lead_class_enrollments e2
                WHERE e2.lead_id = l.id
                  AND e2.board_status = 'confirmado'
                  AND e2.status <> 'CANCELLED'
              )
            RETURNING l.id
        )
        SELECT COUNT(*) INTO v_general_cancelled_count FROM updated_general_cancelled;
        
        RAISE NOTICE 'Leads cancelados gerais atualizados para Não Compareceu: %', v_general_cancelled_count;
    END IF;

END $$;
