-- ============================================================
-- Configure guests by email domain name (@run.edu.ng)
-- ============================================================

-- 1. Update existing profiles that do not have "@run.edu.ng" domain and are not admin.
UPDATE public.profiles
SET role = 'guest',
    badge_type = 'guest',
    badge_color = '#ec4899'
WHERE email NOT ILIKE '%@run.edu.ng' AND role IS DISTINCT FROM 'admin';

-- 2. Create trigger to automatically set guest role and badge for new profiles/emails.
CREATE OR REPLACE FUNCTION public.handle_profile_role_and_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'admin' AND NEW.email NOT ILIKE '%@run.edu.ng' THEN
    NEW.role := 'guest';
    NEW.badge_type := 'guest';
    NEW.badge_color := '#ec4899';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_profile_role_and_badge ON public.profiles;
CREATE TRIGGER trg_handle_profile_role_and_badge
BEFORE INSERT OR UPDATE OF email, role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_role_and_badge();
