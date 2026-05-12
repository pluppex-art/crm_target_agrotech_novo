-- Grant permissions and fix RLS policies for perfis
-- Execute in Supabase SQL Editor

-- 1. Ensure authenticated users have basic table access
GRANT SELECT ON public.perfis TO authenticated;
GRANT SELECT ON public.cargos TO authenticated;

-- 2. Create a security definer function to check admin status
-- This bypasses RLS for the check itself, avoiding recursion
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.perfis p
    JOIN public.cargos c ON c.id = p.role_id
    WHERE p.id = auth.uid()
      AND (
        c.permissions @> '["admin.all"]'::jsonb
        OR c.permissions @> '["users.view"]'::jsonb
        OR LOWER(c.name) LIKE '%admin%'
        OR LOWER(c.name) LIKE '%coordenador%'
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update policies on perfis
DROP POLICY IF EXISTS perfis_select_own ON public.perfis;
DROP POLICY IF EXISTS perfis_select_manager ON public.perfis;
DROP POLICY IF EXISTS perfis_select_admin ON public.perfis;

-- Own profile is always visible
CREATE POLICY perfis_select_own ON public.perfis
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admins see everything
CREATE POLICY perfis_select_admin ON public.perfis
  FOR SELECT TO authenticated
  USING (public.check_is_admin());

-- 4. Fix cargos policies just in case
DROP POLICY IF EXISTS "Users can view cargos" ON public.cargos;
CREATE POLICY "Users can view cargos" ON public.cargos 
  FOR SELECT TO authenticated 
  USING (true);
