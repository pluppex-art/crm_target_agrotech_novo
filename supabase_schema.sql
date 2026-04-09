-- Supabase Schema for CRM

-- 1. Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    product TEXT,
    value NUMERIC DEFAULT 0,
    stars INTEGER DEFAULT 0,
    photo TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'proposal', 'closed')),
    cnpj TEXT,
    city TEXT,
    discount TEXT,
    responsible TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL

);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')),
    date DATE DEFAULT CURRENT_DATE
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    category TEXT,
    stock INTEGER DEFAULT 0,
    image_url TEXT
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE
);

-- 5. Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    content TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    author_name TEXT
);

-- 6. Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'cancelled')),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    value NUMERIC
);

-- 7. Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    type TEXT, -- email, social, ads
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'paused')),
    budget NUMERIC,
    leads_generated INTEGER DEFAULT 0
);

-- Enable Row Level Security (RLS)
-- Note: These are basic rules. For production, you should restrict access based on auth.uid()
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for now, as requested for a quick setup)
CREATE POLICY "Allow all access to leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all access to transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all access to products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all access to notes" ON notes FOR ALL USING (true);
CREATE POLICY "Allow all access to contracts" ON contracts FOR ALL USING (true);
CREATE POLICY "Allow all access to marketing_campaigns" ON marketing_campaigns FOR ALL USING (true);

-- 8. Profiles Table (perfis)
CREATE TABLE IF NOT EXISTS perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    department TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    cpf TEXT,
    avatar_url TEXT
);

-- Enable RLS for perfis
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Create policies for perfis
-- Note: In a real app, you'd restrict this more. For now, we'll allow all to match the other tables.
CREATE POLICY "Allow all access to perfis" ON perfis FOR ALL USING (true);
