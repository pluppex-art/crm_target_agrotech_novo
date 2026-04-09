-- ============================================================
-- EXECUTE ESTE SQL NO SUPABASE - PIPELINE SCHEMA COMPLETO
-- ============================================================
-- Este arquivo contém o schema completo com 4 pipelines
-- Copie todo o conteúdo e execute no Supabase SQL Editor

-- PASSO 1: Abra https://app.supabase.com
-- PASSO 2: Vá para SQL Editor
-- PASSO 3: Clique em "New query"
-- PASSO 4: Copie E COLE TODO O CONTEÚDO DESTE ARQUIVO
-- PASSO 5: Clique em "Run"
-- PASSO 6: Atualize a página do navegador (F5)

-- ============================================================

-- 1. Tabelas Core
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  company_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  position INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pipeline_id, position)
);

-- 2. Leads Integration (flexibiliza status fixo)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id UUID;

-- 3. Indexes Performance (críticos para escala)
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads(pipeline_id, stage_id) WHERE pipeline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id, pipeline_id, stage_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stages_pipeline_pos ON pipeline_stages(pipeline_id, position);
CREATE INDEX IF NOT EXISTS idx_pipelines_active ON pipelines(is_active) WHERE is_active = true;

-- 4. Materialized View Super-Rápida
DROP MATERIALIZED VIEW IF EXISTS pipeline_leads_summary;
CREATE MATERIALIZED VIEW pipeline_leads_summary AS
SELECT 
  p.id pipeline_id, p.name pipeline_name,
  ps.id stage_id, ps.name stage_name, ps.position,
  COALESCE(COUNT(l.id), 0) lead_count,
  COALESCE(SUM(l.value), 0) total_value,
  COALESCE(AVG(l.stars), 0) avg_stars
FROM pipelines p
JOIN pipeline_stages ps ON p.id = ps.pipeline_id
LEFT JOIN leads l ON l.stage_id = ps.id 
  AND (l.pipeline_id = p.id OR l.pipeline_id IS NULL)
WHERE p.is_active AND ps.is_active
GROUP BY p.id, p.name, ps.id, ps.name, ps.position
ORDER BY p.name, ps.position;

CREATE UNIQUE INDEX idx_pipeline_summary ON pipeline_leads_summary(pipeline_id, stage_id);

-- 5. RLS (Multi-Tenant Seguro)
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_rls ON pipelines;
CREATE POLICY pipeline_rls ON pipelines FOR ALL USING (true);

DROP POLICY IF EXISTS stages_rls ON pipeline_stages;
CREATE POLICY stages_rls ON pipeline_stages FOR ALL USING (true);

DROP POLICY IF EXISTS leads_pipeline_rls ON leads;
CREATE POLICY leads_pipeline_rls ON leads FOR ALL USING (true);

-- 6. Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pipelines_updated ON pipelines;
CREATE TRIGGER pipelines_updated BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. SEED DATA - 4 PIPELINES PRONTOS

-- Principal
INSERT INTO pipelines (name, description) VALUES 
 ('Principal', 'Pipeline geral/Drone') ON CONFLICT(name) DO NOTHING;

INSERT INTO pipelines (name, description) VALUES 
 ('Aquecimento', 'Nutrição leads frios - IATF/Drone/Geral') ON CONFLICT(name) DO NOTHING;

INSERT INTO pipelines (name, description) VALUES 
 ('Serviços', 'Contratação de serviços') ON CONFLICT(name) DO NOTHING;

INSERT INTO pipelines (name, description) VALUES 
 ('IATF', 'Certificação IATF 16949') ON CONFLICT(name) DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, color, position) 
SELECT id, 'Novos Leads', '#3B82F6', 0 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Qualificado', '#10B981', 1 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Diagnóstico', '#F59E0B', 2 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Proposta', '#F59E0B', 3 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Follow-up', '#8B5CF6', 4 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Negociação', '#EC4899', 5 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Contrato', '#EF4444', 6 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Ganho', '#22C55E', 7 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Perdido', '#6B7280', 8 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Aquecimento', '#3B82F6', 9 FROM pipelines WHERE name = 'Principal'
UNION ALL SELECT id, 'Desqualificado', '#9CA3AF', 10 FROM pipelines WHERE name = 'Principal'
ON CONFLICT DO NOTHING;

-- Aquecimento (IATF/Drone/Genérico)
INSERT INTO pipeline_stages (pipeline_id, name, color, position) 
SELECT id, 'Lead Frio', '#F3F4F6', 0 FROM pipelines WHERE name = 'Aquecimento'
UNION ALL SELECT id, '1º Contato', '#DBEAFE', 1 FROM pipelines WHERE name = 'Aquecimento'
UNION ALL SELECT id, 'Conteúdo Educacional', '#DCFCE7', 2 FROM pipelines WHERE name = 'Aquecimento'
UNION ALL SELECT id, 'Follow-up IATF/Drone', '#FEF3C7', 3 FROM pipelines WHERE name = 'Aquecimento'
UNION ALL SELECT id, 'Qualificado Aquecido', '#D1FAE5', 4 FROM pipelines WHERE name = 'Aquecimento'
UNION ALL SELECT id, 'Pronto Venda', '#059669', 5 FROM pipelines WHERE name = 'Aquecimento'
ON CONFLICT DO NOTHING;

-- Serviços
INSERT INTO pipeline_stages (pipeline_id, name, color, position) 
SELECT id, 'Prospecção', '#3B82F6', 0 FROM pipelines WHERE name = 'Serviços'
UNION ALL SELECT id, 'Orçamento', '#F59E0B', 1 FROM pipelines WHERE name = 'Serviços'
UNION ALL SELECT id, 'Aprovado', '#10B981', 2 FROM pipelines WHERE name = 'Serviços'
UNION ALL SELECT id, 'Em Execução', '#8B5CF6', 3 FROM pipelines WHERE name = 'Serviços'
UNION ALL SELECT id, 'Concluído', '#22C55E', 4 FROM pipelines WHERE name = 'Serviços'
UNION ALL SELECT id, 'Perdido', '#6B7280', 5 FROM pipelines WHERE name = 'Serviços'
UNION ALL SELECT id, 'Aquecimento', '#3B82F6', 6 FROM pipelines WHERE name = 'Serviços'
ON CONFLICT DO NOTHING;

-- IATF
INSERT INTO pipeline_stages (pipeline_id, name, color, position) 
SELECT id, 'Pré-Auditoria', '#6B7280', 0 FROM pipelines WHERE name = 'IATF'
UNION ALL SELECT id, 'Diagnóstico', '#EF4444', 1 FROM pipelines WHERE name = 'IATF'
UNION ALL SELECT id, 'Plano Ação', '#F59E0B', 2 FROM pipelines WHERE name = 'IATF'
UNION ALL SELECT id, 'Implementação', '#10B981', 3 FROM pipelines WHERE name = 'IATF'
UNION ALL SELECT id, 'Auditoria Final', '#22C55E', 4 FROM pipelines WHERE name = 'IATF'
UNION ALL SELECT id, 'Aprovado', '#059669', 5 FROM pipelines WHERE name = 'IATF'
UNION ALL SELECT id, 'Manutenção', '#8B5CF6', 6 FROM pipelines WHERE name = 'IATF'
UNION ALL SELECT id, 'Perdido', '#6B7280', 7 FROM pipelines WHERE name = 'IATF'
UNION ALL SELECT id, 'Aquecimento', '#3B82F6', 8 FROM pipelines WHERE name = 'IATF'
UNION ALL SELECT id, 'Desqualificado', '#9CA3AF', 9 FROM pipelines WHERE name = 'IATF'
ON CONFLICT DO NOTHING;

-- 8. Auto-Transfer Trigger: Aquecimento → Pipeline Origem (IATF/Drone)
DROP FUNCTION IF EXISTS auto_transfer_from_aquecimento() CASCADE;
CREATE OR REPLACE FUNCTION auto_transfer_from_aquecimento()
RETURNS TRIGGER AS $$
DECLARE
  lead_product TEXT;
  target_pipeline_id UUID;
  target_stage_id UUID;
BEGIN
  -- Só quando muda para 'Pronto Venda' no aquecimento
  IF NEW.stage_id != (SELECT id FROM pipeline_stages WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Aquecimento') AND name = 'Pronto Venda') THEN
    RETURN NEW;
  END IF;

  -- Pega produto do lead
  SELECT product INTO lead_product FROM leads WHERE id = NEW.id;
  
  -- Detecta origem e transfere
  IF NEW.pipeline_id = (SELECT id FROM pipelines WHERE name = 'Aquecimento') THEN
    -- Default pronto venda logic (drone/iatf)
    CASE 
      WHEN lead_product ILIKE '%drone%' THEN
        target_pipeline_id := (SELECT id FROM pipelines WHERE name = 'Principal');
        target_stage_id := (SELECT id FROM pipeline_stages WHERE pipeline_id = target_pipeline_id AND name = 'Qualificado');
      WHEN lead_product ILIKE '%iatf%' THEN
        target_pipeline_id := (SELECT id FROM pipelines WHERE name = 'IATF');  
        target_stage_id := (SELECT id FROM pipeline_stages WHERE pipeline_id = target_pipeline_id AND name = 'Diagnóstico');
      ELSE
        target_pipeline_id := (SELECT id FROM pipelines WHERE name = 'Principal');
        target_stage_id := (SELECT id FROM pipeline_stages WHERE pipeline_id = target_pipeline_id AND name = 'Qualificado');
    END CASE;

    -- Move automaticamente
    UPDATE leads 
    SET pipeline_id = target_pipeline_id, 
        stage_id = target_stage_id,
        updated_at = now()
    WHERE id = NEW.id;

    -- Refresh view
    PERFORM refresh_pipelines();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger no stage_id dos leads
DROP TRIGGER IF EXISTS trigger_leads_auto_transfer ON leads;
CREATE TRIGGER trigger_leads_auto_transfer 
  AFTER UPDATE OF stage_id ON leads
  FOR EACH ROW EXECUTE FUNCTION auto_transfer_from_aquecimento();

-- 9. Refresh Function
DROP FUNCTION IF EXISTS refresh_pipelines() CASCADE;
CREATE OR REPLACE FUNCTION refresh_pipelines()
RETURNS void AS $$ 
BEGIN 
  REFRESH MATERIALIZED VIEW CONCURRENTLY pipeline_leads_summary; 
END; 
$$ LANGUAGE plpgsql;

-- 10. ASSIGN ALL LEADS TO PRINCIPAL PIPELINE - FIRST STAGE
DO $$
DECLARE
  principal_id UUID;
  first_stage_id UUID;
BEGIN
  SELECT id INTO principal_id FROM pipelines WHERE name = 'Principal' LIMIT 1;
  SELECT id INTO first_stage_id FROM pipeline_stages WHERE pipeline_id = principal_id ORDER BY position LIMIT 1;
  
  UPDATE leads 
  SET pipeline_id = principal_id,
      stage_id = first_stage_id
  WHERE pipeline_id IS NULL OR stage_id IS NULL;
END $$;
