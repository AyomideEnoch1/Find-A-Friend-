-- Create security reports table to support incident reporting

CREATE TABLE IF NOT EXISTS public.security_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user TEXT NOT NULL,
  reason        TEXT NOT NULL,
  details       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;

-- Define Policies: Authenticated users can insert their own reports
DROP POLICY IF EXISTS "security_reports: own insert" ON public.security_reports;
CREATE POLICY "security_reports: own insert" ON public.security_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Only administrators can select security reports
DROP POLICY IF EXISTS "security_reports: admin select" ON public.security_reports;
CREATE POLICY "security_reports: admin select" ON public.security_reports
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
