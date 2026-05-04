-- 007_commission_results_add_level.sql
-- Adiciona campo level em commission_results para rastreabilidade de qual regra foi usada no cálculo.
-- Este campo é obrigatório para que o recálculo de OTE use o nível correto de cada usuário.

ALTER TABLE commission_results ADD COLUMN IF NOT EXISTS level TEXT;

-- Comentário explicativo
COMMENT ON COLUMN commission_results.level IS 
  'Nível do cargo (ex: Junior 1, Pleno 2, Sênior 3) usado no cálculo da comissão. '
  'Referencia commission_rules.level. Obrigatório a partir da migration 007.';
