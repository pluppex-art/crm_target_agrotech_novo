-- Add avatar_url to perfis table
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update RLS for avatar
CREATE POLICY "Users can view own avatar" ON public.perfis FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own avatar" ON public.perfis FOR UPDATE USING (auth.uid()::text = id);

-- Index
CREATE INDEX IF NOT EXISTS idx_perfis_avatar ON public.perfis(avatar_url);
