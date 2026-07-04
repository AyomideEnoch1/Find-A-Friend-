-- 1. CREATE SEGMENTED TABLES FOR RESOURCES

CREATE TABLE IF NOT EXISTS public.notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  uploader_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  file_url      TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size_kb  INT,
  resource_type TEXT NOT NULL DEFAULT 'note',
  download_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.past_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  uploader_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  file_url      TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size_kb  INT,
  resource_type TEXT NOT NULL DEFAULT 'past_question',
  download_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.textbooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  uploader_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  file_url      TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size_kb  INT,
  resource_type TEXT NOT NULL DEFAULT 'textbook',
  download_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.slides (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  uploader_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  file_url      TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size_kb  INT,
  resource_type TEXT NOT NULL DEFAULT 'slide',
  download_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.others (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  uploader_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  file_url      TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size_kb  INT,
  resource_type TEXT NOT NULL DEFAULT 'other',
  download_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MIGRATE DATA FROM OLD academic_resources TABLE IF IT EXISTS

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'academic_resources' AND table_type = 'BASE TABLE') THEN
    INSERT INTO public.notes SELECT * FROM public.academic_resources WHERE resource_type = 'note' ON CONFLICT DO NOTHING;
    INSERT INTO public.past_questions SELECT * FROM public.academic_resources WHERE resource_type = 'past_question' ON CONFLICT DO NOTHING;
    INSERT INTO public.textbooks SELECT * FROM public.academic_resources WHERE resource_type = 'textbook' ON CONFLICT DO NOTHING;
    INSERT INTO public.slides SELECT * FROM public.academic_resources WHERE resource_type = 'slide' ON CONFLICT DO NOTHING;
    INSERT INTO public.others SELECT * FROM public.academic_resources WHERE resource_type = 'other' ON CONFLICT DO NOTHING;
    
    DROP TABLE public.academic_resources CASCADE;
  END IF;
END $$;

-- 3. CREATE BACKWARD COMPATIBLE VIEW

CREATE OR REPLACE VIEW public.academic_resources AS
  SELECT * FROM public.notes
  UNION ALL
  SELECT * FROM public.past_questions
  UNION ALL
  SELECT * FROM public.textbooks
  UNION ALL
  SELECT * FROM public.slides
  UNION ALL
  SELECT * FROM public.others;

-- 4. CREATE INSTEAD OF TRIGGERS ON VIEW FOR DML ROUTING

CREATE OR REPLACE FUNCTION public.route_academic_resource_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resource_type = 'note' THEN
    INSERT INTO public.notes (id, course_id, uploader_id, title, description, file_url, file_type, file_size_kb, resource_type, download_count, created_at)
    VALUES (NEW.id, NEW.course_id, NEW.uploader_id, NEW.title, NEW.description, NEW.file_url, NEW.file_type, NEW.file_size_kb, NEW.resource_type, NEW.download_count, NEW.created_at);
  ELSIF NEW.resource_type = 'past_question' THEN
    INSERT INTO public.past_questions (id, course_id, uploader_id, title, description, file_url, file_type, file_size_kb, resource_type, download_count, created_at)
    VALUES (NEW.id, NEW.course_id, NEW.uploader_id, NEW.title, NEW.description, NEW.file_url, NEW.file_type, NEW.file_size_kb, NEW.resource_type, NEW.download_count, NEW.created_at);
  ELSIF NEW.resource_type = 'textbook' THEN
    INSERT INTO public.textbooks (id, course_id, uploader_id, title, description, file_url, file_type, file_size_kb, resource_type, download_count, created_at)
    VALUES (NEW.id, NEW.course_id, NEW.uploader_id, NEW.title, NEW.description, NEW.file_url, NEW.file_type, NEW.file_size_kb, NEW.resource_type, NEW.download_count, NEW.created_at);
  ELSIF NEW.resource_type = 'slide' THEN
    INSERT INTO public.slides (id, course_id, uploader_id, title, description, file_url, file_type, file_size_kb, resource_type, download_count, created_at)
    VALUES (NEW.id, NEW.course_id, NEW.uploader_id, NEW.title, NEW.description, NEW.file_url, NEW.file_type, NEW.file_size_kb, NEW.resource_type, NEW.download_count, NEW.created_at);
  ELSE
    INSERT INTO public.others (id, course_id, uploader_id, title, description, file_url, file_type, file_size_kb, resource_type, download_count, created_at)
    VALUES (NEW.id, NEW.course_id, NEW.uploader_id, NEW.title, NEW.description, NEW.file_url, NEW.file_type, NEW.file_size_kb, NEW.resource_type, NEW.download_count, NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_route_academic_resource_insert ON public.academic_resources;
CREATE TRIGGER trg_route_academic_resource_insert
INSTEAD OF INSERT ON public.academic_resources
FOR EACH ROW EXECUTE FUNCTION public.route_academic_resource_insert();

CREATE OR REPLACE FUNCTION public.route_academic_resource_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resource_type = 'note' THEN
    UPDATE public.notes SET
      course_id = NEW.course_id, uploader_id = NEW.uploader_id, title = NEW.title,
      description = NEW.description, file_url = NEW.file_url, file_type = NEW.file_type,
      file_size_kb = NEW.file_size_kb, download_count = NEW.download_count, created_at = NEW.created_at
    WHERE id = OLD.id;
  ELSIF NEW.resource_type = 'past_question' THEN
    UPDATE public.past_questions SET
      course_id = NEW.course_id, uploader_id = NEW.uploader_id, title = NEW.title,
      description = NEW.description, file_url = NEW.file_url, file_type = NEW.file_type,
      file_size_kb = NEW.file_size_kb, download_count = NEW.download_count, created_at = NEW.created_at
    WHERE id = OLD.id;
  ELSIF NEW.resource_type = 'textbook' THEN
    UPDATE public.textbooks SET
      course_id = NEW.course_id, uploader_id = NEW.uploader_id, title = NEW.title,
      description = NEW.description, file_url = NEW.file_url, file_type = NEW.file_type,
      file_size_kb = NEW.file_size_kb, download_count = NEW.download_count, created_at = NEW.created_at
    WHERE id = OLD.id;
  ELSIF NEW.resource_type = 'slide' THEN
    UPDATE public.slides SET
      course_id = NEW.course_id, uploader_id = NEW.uploader_id, title = NEW.title,
      description = NEW.description, file_url = NEW.file_url, file_type = NEW.file_type,
      file_size_kb = NEW.file_size_kb, download_count = NEW.download_count, created_at = NEW.created_at
    WHERE id = OLD.id;
  ELSE
    UPDATE public.others SET
      course_id = NEW.course_id, uploader_id = NEW.uploader_id, title = NEW.title,
      description = NEW.description, file_url = NEW.file_url, file_type = NEW.file_type,
      file_size_kb = NEW.file_size_kb, download_count = NEW.download_count, created_at = NEW.created_at
    WHERE id = OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_route_academic_resource_update ON public.academic_resources;
CREATE TRIGGER trg_route_academic_resource_update
INSTEAD OF UPDATE ON public.academic_resources
FOR EACH ROW EXECUTE FUNCTION public.route_academic_resource_update();

CREATE OR REPLACE FUNCTION public.route_academic_resource_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.resource_type = 'note' THEN
    DELETE FROM public.notes WHERE id = OLD.id;
  ELSIF OLD.resource_type = 'past_question' THEN
    DELETE FROM public.past_questions WHERE id = OLD.id;
  ELSIF OLD.resource_type = 'textbook' THEN
    DELETE FROM public.textbooks WHERE id = OLD.id;
  ELSIF OLD.resource_type = 'slide' THEN
    DELETE FROM public.slides WHERE id = OLD.id;
  ELSE
    DELETE FROM public.others WHERE id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_route_academic_resource_delete ON public.academic_resources;
CREATE TRIGGER trg_route_academic_resource_delete
INSTEAD OF DELETE ON public.academic_resources
FOR EACH ROW EXECUTE FUNCTION public.route_academic_resource_delete();

-- 5. ENABLE ROW LEVEL SECURITY & DEFINE POLICIES ON SEGMENT TABLES

-- notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notes: read" ON public.notes;
CREATE POLICY "notes: read" ON public.notes FOR SELECT USING (true);
DROP POLICY IF EXISTS "notes: own insert" ON public.notes;
CREATE POLICY "notes: own insert" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

-- past_questions
ALTER TABLE public.past_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "past_questions: read" ON public.past_questions;
CREATE POLICY "past_questions: read" ON public.past_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "past_questions: own insert" ON public.past_questions;
CREATE POLICY "past_questions: own insert" ON public.past_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

-- textbooks
ALTER TABLE public.textbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "textbooks: read" ON public.textbooks;
CREATE POLICY "textbooks: read" ON public.textbooks FOR SELECT USING (true);
DROP POLICY IF EXISTS "textbooks: own insert" ON public.textbooks;
CREATE POLICY "textbooks: own insert" ON public.textbooks FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

-- slides
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "slides: read" ON public.slides;
CREATE POLICY "slides: read" ON public.slides FOR SELECT USING (true);
DROP POLICY IF EXISTS "slides: own insert" ON public.slides;
CREATE POLICY "slides: own insert" ON public.slides FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

-- others
ALTER TABLE public.others ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "others: read" ON public.others;
CREATE POLICY "others: read" ON public.others FOR SELECT USING (true);
DROP POLICY IF EXISTS "others: own insert" ON public.others;
CREATE POLICY "others: own insert" ON public.others FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

-- 6. CORRECT STORAGE BUCKET POLICIES FOR ACADEMIC-RESOURCES

DROP POLICY IF EXISTS "academic-resources: auth select" ON storage.objects;
CREATE POLICY "academic-resources: auth select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'academic-resources');

DROP POLICY IF EXISTS "academic-resources: auth insert" ON storage.objects;
CREATE POLICY "academic-resources: auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'academic-resources');
