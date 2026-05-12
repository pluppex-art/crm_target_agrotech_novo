-- #F05 + #F03 + #D04 + #F09 + #F08 + #T02 — Adicionar colunas novas (fases 1A-1F)

-- ── F05: seller_origin em leads e lead_class_enrollments ──
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS seller_origin TEXT
    CHECK (seller_origin IN ('target', 'pluppex'));

ALTER TABLE lead_class_enrollments
  ADD COLUMN IF NOT EXISTS seller_origin TEXT
    CHECK (seller_origin IN ('target', 'pluppex'));

-- ── F03: responsible_id (FK → perfis) em lead_class_enrollments ──
ALTER TABLE lead_class_enrollments
  ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES perfis(id);

UPDATE lead_class_enrollments lce
   SET responsible_id = p.id
  FROM perfis p
 WHERE LOWER(TRIM(lce.responsible)) = LOWER(TRIM(p.name))
   AND lce.responsible_id IS NULL;

-- ── D04: tasks já usa responsavel_usuario_id (UUID FK → perfis) — sem alteração necessária ──

-- ── F09: cost_center nas tabelas financeiras ──
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS cost_center TEXT
    CHECK (cost_center IN ('cursos', 'servico_drone', 'administrativo'));

ALTER TABLE lead_class_enrollments
  ADD COLUMN IF NOT EXISTS cost_center TEXT DEFAULT 'cursos'
    CHECK (cost_center IN ('cursos', 'servico_drone', 'administrativo'));

ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS cost_center TEXT DEFAULT 'cursos'
    CHECK (cost_center IN ('cursos', 'servico_drone', 'administrativo'));

-- Inferir cost_center para turmas/enrollments de serviço de drone
UPDATE turmas
   SET cost_center = 'servico_drone'
 WHERE LOWER(name) LIKE '%drone%'
    OR LOWER(name) LIKE '%aplicac%'
    OR LOWER(category) LIKE '%servico%'
    OR LOWER(category) LIKE '%drone%';

UPDATE lead_class_enrollments lce
   SET cost_center = t.cost_center
  FROM turmas t
 WHERE t.id = lce.class_id
   AND lce.cost_center = 'cursos';

-- ── F08: instructor_cost e is_processed_finance em turmas ──
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS instructor_cost NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_processed_finance BOOLEAN DEFAULT FALSE;

-- ── T02: professor_id (FK → perfis) em turmas ──
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS professor_id UUID REFERENCES perfis(id);

UPDATE turmas t
   SET professor_id = p.id
  FROM perfis p
 WHERE LOWER(TRIM(t.professor_name)) = LOWER(TRIM(p.name))
   AND t.professor_id IS NULL;

-- ── T01: contracted_amount NOT NULL em lead_class_enrollments ──
-- Primeiro popula os NULLs com o preço da turma
UPDATE lead_class_enrollments lce
   SET contracted_amount = t.price
  FROM turmas t
 WHERE t.id = lce.class_id
   AND (lce.contracted_amount IS NULL OR lce.contracted_amount = 0);

-- D02: Corrigir leads sem stage_id (invisíveis no Kanban)
UPDATE leads
   SET pipeline_id = (SELECT id FROM pipelines WHERE name = 'Principal' LIMIT 1),
       stage_id    = (
         SELECT ps.id
           FROM pipeline_stages ps
           JOIN pipelines p ON p.id = ps.pipeline_id
          WHERE p.name = 'Principal'
          ORDER BY ps.position ASC
          LIMIT 1
       )
 WHERE stage_id IS NULL;
