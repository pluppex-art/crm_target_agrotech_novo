-- Fix RLS for perfis to avoid recursion and ensure admins can see all
-- Execute this in the Supabase SQL Editor

-- 1. Create a function to check if a user is an admin (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM perfis p
    JOIN cargos c ON c.id = p.role_id
    WHERE p.id = auth.uid()
      AND (
        c.permissions @> '["admin.all"]'::jsonb
        OR LOWER(c.name) LIKE '%admin%'
        OR LOWER(c.name) LIKE '%coordenador%'
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing policies on perfis
DROP POLICY IF EXISTS perfis_select_own ON perfis;
DROP POLICY IF EXISTS perfis_select_manager ON perfis;

-- 3. Create new policies
-- Everyone can see their own profile
CREATE POLICY perfis_select_own ON perfis
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admins can see everything
CREATE POLICY perfis_select_admin ON perfis
  FOR SELECT TO authenticated
  USING (is_admin());

-- 4. Ensure authenticated role has select permission
GRANT SELECT ON perfis TO authenticated;
GRANT SELECT ON cargos TO authenticated;
