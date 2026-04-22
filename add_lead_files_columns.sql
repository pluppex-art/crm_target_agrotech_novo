-- Migration: Add payment_proof_url and contract_url to leads table
-- Run this in Supabase SQL Editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS payment_proof_url  TEXT,
  ADD COLUMN IF NOT EXISTS contract_url       TEXT,
  ADD COLUMN IF NOT EXISTS professor_proof_url TEXT;

-- ──────────────────────────────────────────────────────────────────
-- Supabase Storage: Create bucket for lead files
-- Run these commands in the Supabase Dashboard → Storage → New Bucket
-- OR run via SQL Editor using the storage schema:

-- 1. Create the bucket (public for read, authenticated for write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-files', 'lead-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Anyone authenticated can upload
CREATE POLICY "Authenticated users can upload lead files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lead-files');

-- 3. Policy: Public read (so links work for everyone)
CREATE POLICY "Public read lead files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lead-files');

-- 4. Policy: Authenticated users can delete their own uploads
CREATE POLICY "Authenticated users can delete lead files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lead-files');
