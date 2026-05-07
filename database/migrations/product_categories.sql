-- Tabela de Categorias de Produto

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso total (Seguindo o padrão do projeto)
DROP POLICY IF EXISTS "Allow all access to product_categories" ON product_categories;
CREATE POLICY "Allow all access to product_categories" ON product_categories FOR ALL USING (true);

-- Inserir categorias padrão
INSERT INTO product_categories (name) VALUES ('Cursos'), ('Serviços') 
ON CONFLICT (name) DO NOTHING;
