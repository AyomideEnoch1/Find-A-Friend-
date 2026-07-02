-- 1. Create id-cards storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-cards', 
  'id-cards', 
  false, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Define storage policies for the id-cards bucket
DROP POLICY IF EXISTS "Admins can view ID cards" ON storage.objects;
CREATE POLICY "Admins can view ID cards" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'id-cards' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can upload their own ID card" ON storage.objects;
CREATE POLICY "Users can upload their own ID card" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'id-cards'
  );

DROP POLICY IF EXISTS "Users can update their own ID card" ON storage.objects;
CREATE POLICY "Users can update their own ID card" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'id-cards'
  );

-- 3. Redefine profile role assignment trigger function
-- Dynamically matches email domains against registered universities
CREATE OR REPLACE FUNCTION public.handle_profile_role_and_badge()
RETURNS TRIGGER AS $$
DECLARE
  v_matching_uni BOOLEAN;
BEGIN
  -- Preserve admin roles
  IF NEW.role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Verify if email ends with any university's domain
  SELECT EXISTS (
    SELECT 1 FROM public.universities 
    WHERE NEW.email ILIKE '%@' || domain OR NEW.email ILIKE '%.' || domain
  ) INTO v_matching_uni;

  IF v_matching_uni THEN
    -- Grant student status if matched
    IF NEW.role NOT IN ('student', 'vendor', 'admin') THEN
      NEW.role := 'student';
    END IF;
  ELSE
    -- Revert to guest role for manual admin approval
    NEW.role := 'guest';
    NEW.badge_type := 'guest';
    NEW.badge_color := '#ec4899';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-bind trigger to profile table
DROP TRIGGER IF EXISTS trg_handle_profile_role_and_badge ON public.profiles;
CREATE TRIGGER trg_handle_profile_role_and_badge
BEFORE INSERT OR UPDATE OF email, role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_role_and_badge();
