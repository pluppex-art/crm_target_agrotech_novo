-- Create activity_categories table
CREATE TABLE IF NOT EXISTS activity_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add default categories
INSERT INTO activity_categories (name) VALUES
  ('Ligação'),
  ('Visita'),
  ('Email'),
  ('Reunião'),
  ('WhatsApp'),
  ('Demonstração'),
  ('Follow-up'),
  ('Outro')
ON CONFLICT (name) DO NOTHING;

-- Add category, scheduled_time and lead_name columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lead_name TEXT;

-- Enable RLS on activity_categories
ALTER TABLE activity_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "activity_categories_select" ON activity_categories
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "activity_categories_insert" ON activity_categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "activity_categories_delete" ON activity_categories
  FOR DELETE USING (true);
