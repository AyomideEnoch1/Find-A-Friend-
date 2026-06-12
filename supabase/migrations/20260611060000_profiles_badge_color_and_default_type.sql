-- Add badge_type and badge_color columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badge_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badge_color TEXT;

-- Update existing profiles that have university emails but no badge
UPDATE public.profiles
SET badge_type = 'verified'
WHERE badge_type IS NULL AND (
  email LIKE '%.edu' OR email = '%.edu' OR
  email LIKE '%.edu.ng' OR email = '%.edu.ng' OR
  email LIKE '%.ac.uk' OR email = '%.ac.uk' OR
  email LIKE '%.ac.za' OR email = '%.ac.za' OR
  email LIKE '%.edu.%'
);

-- Trigger to automatically set badge_type to 'verified' for university emails
CREATE OR REPLACE FUNCTION public.set_default_badge_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.badge_type IS NULL AND (
    NEW.email LIKE '%.edu' OR NEW.email = '%.edu' OR
    NEW.email LIKE '%.edu.ng' OR NEW.email = '%.edu.ng' OR
    NEW.email LIKE '%.ac.uk' OR NEW.email = '%.ac.uk' OR
    NEW.email LIKE '%.ac.za' OR NEW.email = '%.ac.za' OR
    NEW.email LIKE '%.edu.%'
  ) THEN
    NEW.badge_type := 'verified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_default_badge_type ON public.profiles;
CREATE TRIGGER trg_set_default_badge_type
BEFORE INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_default_badge_type();
