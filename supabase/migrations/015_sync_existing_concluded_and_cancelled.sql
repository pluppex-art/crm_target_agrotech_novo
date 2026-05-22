-- Migration: Sync existing concluded classes and cancelled attendees to their correct pipeline stages
-- Run this in your Supabase SQL Editor to retroactively update all historical leads.

DO $$
DECLARE
    v_turma_concluida_stage_id UUID;
    v_nao_compareceu_stage_id UUID;
    v_updated_concluded_count INT := 0;
    v_updated_cancelled_count INT := 0;
BEGIN
    -- 1. Buscar a etapa "Turma Concluída" de forma resiliente
    SELECT id INTO v_turma_concluida_stage_id
    FROM pipeline_stages
    WHERE (name ILIKE '%Turma Conclu%' OR name ILIKE '%Conclu%')
      AND is_active = true
    ORDER BY position ASC
    LIMIT 1;

    -- 2. Buscar a etapa "Não Compareceu" de forma resiliente
    SELECT id INTO v_nao_compareceu_stage_id
    FROM pipeline_stages
    WHERE (name ILIKE '%Não Compareceu%' OR name ILIKE '%Nao Compareceu%' OR name ILIKE '%Compareceu%')
      AND is_active = true
    ORDER BY position ASC
    LIMIT 1;

    -- 3. Atualizar leads de turmas concluídas antigas
    IF v_turma_concluida_stage_id IS NOT NULL THEN
        WITH updated AS (
            UPDATE leads l
            SET stage_id = v_turma_concluida_stage_id,
                substatus = 'Turma Concluída'
            FROM lead_class_enrollments e
            JOIN turmas t ON e.class_id = t.id
            WHERE e.lead_id = l.id
              AND t.status = 'concluida'
              AND e.status <> 'CANCELLED'
            RETURNING l.id
        )
        SELECT COUNT(*) INTO v_updated_concluded_count FROM updated;
        
        RAISE NOTICE 'Leads de turmas concluídas antigas atualizados: %', v_updated_concluded_count;
    ELSE
        RAISE NOTICE 'Etapa "Turma Concluída" não encontrada.';
    END IF;

    -- 4. Atualizar leads de alunos cancelados antigos
    IF v_nao_compareceu_stage_id IS NOT NULL THEN
        WITH updated AS (
            UPDATE leads l
            SET stage_id = v_nao_compareceu_stage_id,
                substatus = 'Não Compareceu'
            FROM lead_class_enrollments e
            WHERE e.lead_id = l.id
              AND e.board_status = 'cancelado'
              AND e.status <> 'CANCELLED'
            RETURNING l.id
        )
        SELECT COUNT(*) INTO v_updated_cancelled_count FROM updated;
        
        RAISE NOTICE 'Leads cancelados antigos atualizados: %', v_updated_cancelled_count;
    ELSE
        RAISE NOTICE 'Etapa "Não Compareceu" não encontrada.';
    END IF;

END $$;
