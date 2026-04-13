-- Create cargos table
CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

-- Policies for cargos - Allow authenticated users CRUD (match other tables)
CREATE POLICY "Users can view cargos" ON public.cargos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage cargos" ON public.cargos FOR ALL USING (auth.role() = 'authenticated');

-- Update perfis to have role_id (add column, migrate data later)
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_cargos_name ON public.cargos(name);
CREATE INDEX idx_perfis_role_id ON public.perfis(role_id);

-- Initial data
INSERT INTO public.cargos (name, description) VALUES 
('Consultor', 'Consultor de vendas'),
('Gerente', 'Gerente de equipe'),
('Administrador', 'Acesso total'),
('Financeiro', 'Gestão financeira')
ON CONFLICT (name) DO NOTHING;

