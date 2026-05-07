-- 017_squads_write_rls.sql
-- Adiciona policies de escrita na tabela squads para usuários autenticados.
-- Necessário para atualização do manager_id via Perfis OTE (SettingsTab).

DROP POLICY IF EXISTS "Authenticated users can manage squads" ON squads;
CREATE POLICY "Authenticated users can manage squads"
  ON squads FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
