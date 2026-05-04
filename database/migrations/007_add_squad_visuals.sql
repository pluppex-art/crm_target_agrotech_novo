-- 007_add_squad_visuals.sql
-- Add color and logo_url columns to squads table
-- Execute this in the Supabase SQL Editor

ALTER TABLE squads ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';
ALTER TABLE squads ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update existing squads with a default color if they don't have one
UPDATE squads SET color = '#6366f1' WHERE color IS NULL;
