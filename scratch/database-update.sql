-- scratch/database-update.sql
-- Run this script in your Supabase Dashboard SQL Editor to add the missing tables,
-- columns, triggers, and views required for onboarding and ID card verification.

-- ─── 1. CREATE UNIVERSITIES TABLE & RLS ───
CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL UNIQUE,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on universities" ON public.universities;
CREATE POLICY "Allow public read access on universities" 
  ON public.universities FOR SELECT 
  TO authenticated 
  USING (true);

-- Seed initial universities
INSERT INTO public.universities (name, domain, short_name, primary_color, secondary_color)
VALUES 
  ('University of Lagos', 'unilag.edu.ng', 'UNILAG', '#002244', '#FFD700'),
  ('University of Ibadan', 'ui.edu.ng', 'UI', '#004B49', '#FFD700'),
  ('FAF Campus Demo', 'fafcampus.site', 'FAF Demo', '#8b5cf6', '#6366f1'),
  ('Redeemer''s University', 'run.edu.ng', 'RUN', '#0a2f5c', '#e5b73b')
ON CONFLICT (domain) DO NOTHING;


-- ─── 2. ADD MISSING COLUMNS TO PROFILES ───
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_status TEXT DEFAULT 'not_uploaded';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS forced_signout_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS joined_global_hub BOOLEAN DEFAULT false;


-- ─── 3. ADD MISSING COLUMNS TO POSTS & VIEWS ───
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS posted_to_global_hub BOOLEAN DEFAULT false;

CREATE OR REPLACE VIEW public.local_posts AS
SELECT * FROM public.posts
WHERE posted_to_global_hub = false;

CREATE OR REPLACE VIEW public.global_posts AS
SELECT * FROM public.posts
WHERE posted_to_global_hub = true;


-- ─── 4. CREATE CASCADE DELETE TRIGGER FOR PROFILES ───
CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_auth_user_deleted ON auth.users;
CREATE TRIGGER trg_handle_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_deleted();
