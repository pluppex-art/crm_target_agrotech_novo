-- Add subStatus column to leads if it doesn't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS subStatus TEXT DEFAULT NULL CHECK (subStatus IN ('qualified', 'warming', 'disqualified') OR subStatus IS NULL);

-- Add last_contact_at column if it doesn't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads(pipeline_id, stage_id) WHERE pipeline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_responsible ON leads(responsible) WHERE responsible IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON leads(last_contact_at) WHERE last_contact_at IS NOT NULL;
