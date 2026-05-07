-- 010_fix_commission_rules_and_rls.sql
-- 1. Normaliza os níveis para Title Case (consistente com VALID_LEVELS do frontend)
UPDATE commission_rules SET level = 'Aprendiz'  WHERE level ILIKE 'APRENDIZ';
UPDATE commission_rules SET level = 'Junior 1'  WHERE level ILIKE 'JUNIOR 1';
UPDATE commission_rules SET level = 'Junior 2'  WHERE level ILIKE 'JUNIOR 2';
UPDATE commission_rules SET level = 'Junior 3'  WHERE level ILIKE 'JUNIOR 3';
UPDATE commission_rules SET level = 'Pleno 1'   WHERE level ILIKE 'PLENO 1';
UPDATE commission_rules SET level = 'Pleno 2'   WHERE level ILIKE 'PLENO 2';
UPDATE commission_rules SET level = 'Pleno 3'   WHERE level ILIKE 'PLENO 3';
UPDATE commission_rules SET level = 'Sênior 1'  WHERE level ILIKE 'SENIOR 1';
UPDATE commission_rules SET level = 'Sênior 2'  WHERE level ILIKE 'SENIOR 2';
UPDATE commission_rules SET level = 'Sênior 3'  WHERE level ILIKE 'SENIOR 3';

-- 2. Adiciona policies de escrita em commission_rules (faltavam)
DROP POLICY IF EXISTS "Authenticated users can manage commission_rules" ON commission_rules;
CREATE POLICY "Authenticated users can manage commission_rules"
  ON commission_rules FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Corrige RLS de commission_results para permitir upsert do service
DROP POLICY IF EXISTS "Service can upsert commission_results" ON commission_results;
CREATE POLICY "Service can upsert commission_results"
  ON commission_results FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
