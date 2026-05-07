-- 016_fix_financial_transactions_rls.sql
-- Corrige o SELECT RLS de financial_transactions.
--
-- Problema:
--   A policy original verifica: auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin'
--   O Supabase com anon key NUNCA emite 'role = admin' no JWT padrão.
--   Resultado: cada usuário só enxerga as transações onde é o vendedor (user_id).
--   Transações com user_id = NULL (leads sem vendedor identificado) ficam invisíveis
--   para todos, inclusive para o admin do CRM.
--
-- Decisão:
--   O controle de acesso à página financeira já é feito via cargos (hasPermission).
--   Na camada de banco, basta garantir que usuários autenticados possam ler tudo.
--   As políticas de INSERT/UPDATE já estão corretas (admin only via app-level).
--
-- NÃO DESTRUTIVO para dados. Apenas substitui a policy de SELECT.
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove a policy restritiva original
DROP POLICY IF EXISTS "Users can view related transactions" ON financial_transactions;

-- Nova policy: qualquer usuário autenticado pode ler todas as transações
-- (o gate de acesso à tela já é feito no frontend via hasPermission('finance.view'))
CREATE POLICY "Authenticated users can view all transactions"
  ON financial_transactions
  FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificação
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_old_policy  BOOLEAN;
  v_new_policy  BOOLEAN;
  v_total_count BIGINT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'financial_transactions'
      AND policyname = 'Users can view related transactions'
  ) INTO v_old_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'financial_transactions'
      AND policyname = 'Authenticated users can view all transactions'
  ) INTO v_new_policy;

  SELECT COUNT(*) INTO v_total_count FROM financial_transactions;

  RAISE NOTICE '016 — policy antiga removida (esperado false) : %', v_old_policy;
  RAISE NOTICE '016 — nova policy criada                      : %', v_new_policy;
  RAISE NOTICE '016 — total de transações visíveis agora      : %', v_total_count;
END;
$$;
