-- Settings table for CRM configurations
CREATE TABLE IF NOT EXISTS crm_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default lead transfer timeout (48 hours)
INSERT INTO crm_settings (key, value)
VALUES ('lead_transfer_timeout_hours', '48')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (simpler for this case, usually restricted to admins)
CREATE POLICY "Allow all access to crm_settings" ON crm_settings FOR ALL USING (true) WITH CHECK (true);
