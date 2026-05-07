-- Notifications Schema for Target Agrotech CRM

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('urgent', 'pending', 'info', 'success', 'system')),
    category TEXT CHECK (category IN ('user', 'system')),
    read BOOLEAN DEFAULT false,
    link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL); -- IS NULL for system-wide alerts if needed

CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (true); -- Usually restricted, but following project pattern of "allow all" for now

CREATE POLICY "Users can delete their own notifications" 
ON notifications FOR DELETE 
USING (auth.uid() = user_id);

-- Global CRM Settings Table
CREATE TABLE IF NOT EXISTS crm_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT
);

-- Initial Settings
INSERT INTO crm_settings (key, value, description) 
VALUES ('auto_transfer_hours', '48'::jsonb, 'Tempo em horas de inatividade para transferência automática de lead')
ON CONFLICT (key) DO NOTHING;

-- Policies
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for all users" ON crm_settings FOR SELECT USING (true);
CREATE POLICY "Allow update for authenticated users" ON crm_settings FOR UPDATE USING (auth.role() = 'authenticated');
