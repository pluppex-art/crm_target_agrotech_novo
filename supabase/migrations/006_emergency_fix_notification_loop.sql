-- #C02 FASE 0 — Emergência: Parar loop de notificações + corrigir trigger auto_transfer

-- STEP 1: Limpeza urgente de notificações duplicadas
-- Para notificações urgent: manter apenas a mais recente por (user_id, title) — necessário para o índice único
DELETE FROM notifications
WHERE type = 'urgent'
  AND id NOT IN (
    SELECT DISTINCT ON (user_id, title) id
    FROM notifications
    WHERE type = 'urgent'
    ORDER BY user_id, title, created_at DESC
  );

-- Para demais tipos: manter últimas 5 por (user_id, title)
DELETE FROM notifications
WHERE type != 'urgent'
  AND id NOT IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id, title ORDER BY created_at DESC) AS rn
      FROM notifications
      WHERE type != 'urgent'
    ) t
    WHERE rn <= 5
  );

-- STEP 2: Índice de deduplicação para evitar novos loops
-- Garante no máximo 1 notificação urgent por (user_id, title).
-- A janela de 24h é controlada pela lógica em leadNotificationService.ts (já existente).
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedup
  ON notifications(user_id, title)
  WHERE type = 'urgent';

-- STEP 3: Corrigir função auto_transfer_from_aquecimento para não entrar em loop
CREATE OR REPLACE FUNCTION auto_transfer_from_aquecimento()
RETURNS TRIGGER AS $$
DECLARE
  target_pipeline_id UUID;
  target_stage_id UUID;
  aquecimento_pipeline_id UUID;
  pronto_venda_stage_id UUID;
BEGIN
  -- Resolver IDs de pipeline/stage de Aquecimento para guardrail
  SELECT id INTO aquecimento_pipeline_id FROM pipelines WHERE name = 'Aquecimento' LIMIT 1;
  IF aquecimento_pipeline_id IS NULL THEN RETURN NEW; END IF;

  SELECT ps.id INTO pronto_venda_stage_id
    FROM pipeline_stages ps
    JOIN pipelines p ON p.id = ps.pipeline_id
   WHERE p.name = 'Aquecimento' AND ps.name = 'Pronto Venda'
   LIMIT 1;

  -- GUARDRAIL 1: só executa se ainda está no pipeline Aquecimento
  IF NEW.pipeline_id IS DISTINCT FROM aquecimento_pipeline_id THEN RETURN NEW; END IF;

  -- GUARDRAIL 2: só executa se chegou exatamente na etapa "Pronto Venda"
  IF NEW.stage_id IS DISTINCT FROM pronto_venda_stage_id THEN RETURN NEW; END IF;

  -- GUARDRAIL 3: não re-dispara se pipeline já mudou (evita loop)
  IF OLD.pipeline_id IS DISTINCT FROM aquecimento_pipeline_id THEN RETURN NEW; END IF;

  -- Roteamento por produto
  IF (NEW.product ILIKE '%drone%') THEN
    SELECT id INTO target_pipeline_id FROM pipelines WHERE name = 'Principal' LIMIT 1;
    SELECT id INTO target_stage_id
      FROM pipeline_stages
     WHERE pipeline_id = target_pipeline_id AND name = 'Qualificado'
     LIMIT 1;
  ELSE
    SELECT id INTO target_pipeline_id FROM pipelines WHERE name = 'IATF' LIMIT 1;
    SELECT id INTO target_stage_id
      FROM pipeline_stages
     WHERE pipeline_id = target_pipeline_id AND name = 'Diagnóstico'
     LIMIT 1;
  END IF;

  -- Só faz UPDATE se IDs foram resolvidos (evita UPDATE com NULL que causa outro disparo)
  IF target_pipeline_id IS NOT NULL AND target_stage_id IS NOT NULL THEN
    UPDATE leads
       SET pipeline_id = target_pipeline_id,
           stage_id    = target_stage_id,
           updated_at  = now()
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
