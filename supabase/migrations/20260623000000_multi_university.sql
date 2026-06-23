-- Create universities table
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

-- Enable RLS on universities
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- Allow public read access to universities
CREATE POLICY "Allow public read access on universities" 
  ON public.universities FOR SELECT 
  TO authenticated 
  USING (true);

-- Add university_id column to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id);

-- Seed initial universities
INSERT INTO public.universities (name, domain, short_name, primary_color, secondary_color)
VALUES 
  ('University of Lagos', 'unilag.edu.ng', 'UNILAG', '#002244', '#FFD700'),
  ('University of Ibadan', 'ui.edu.ng', 'UI', '#004B49', '#FFD700'),
  ('FAF Campus Demo', 'fafcampus.site', 'FAF Demo', '#8b5cf6', '#6366f1'),
  ('Redeemer''s University', 'run.edu.ng', 'RUN', '#0a2f5c', '#e5b73b')
ON CONFLICT (domain) DO NOTHING;
