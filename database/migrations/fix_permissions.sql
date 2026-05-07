-- Fix permissions schema + migration
-- Execute no Supabase SQL Editor

-- 1. Create cargos table if not exists
CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view cargos" ON public.cargos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage cargos" ON public.cargos FOR ALL USING (auth.role() = 'authenticated');

-- 3. Add role_id to perfis if not exists
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL;

-- 4. Create initial cargos with permissions
INSERT INTO public.cargos (name, description, permissions) VALUES 
('Consultor', 'Consultor de vendas', '["leads.view"]'::jsonb),
('Gerente', 'Gerente de equipe', '["leads.view","leads.create","leads.edit","pipeline.view"]'::jsonb),
('Administrador', 'Acesso total', '["admin.all"]'::jsonb),
('Financeiro', 'Gestão financeira', '["finance.view","finance.create"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET 
  permissions = EXCLUDED.permissions,
  updated_at = now();

-- 5. Update existing perfis to use proper UUID role_id
UPDATE public.perfis 
SET role_id = (
  SELECT id FROM public.cargos WHERE name = 'Administrador'
) 
WHERE role_id IS NULL OR role_id::text = name;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_cargos_name ON public.cargos(name);
CREATE INDEX IF NOT EXISTS idx_perfis_role_id ON public.perfis(role_id);

-- 7. Verify data
SELECT 'Cargos OK: ' || count(*) as cargos_count FROM public.cargos;
SELECT 'Perfis com role_id: ' || count(*) as perfis_assigned FROM public.perfis WHERE role_id IS NOT NULL;

