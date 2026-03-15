
-- Fix RLS: Allow anonymous users to INSERT enrollments from public page
CREATE POLICY "Public can create enrollments" ON public.course_enrollments
  FOR INSERT TO anon
  WITH CHECK (true);

-- Fix RLS: Allow anonymous users to INSERT into waitlist from public page
CREATE POLICY "Public can join waitlist" ON public.course_waitlist
  FOR INSERT TO anon
  WITH CHECK (true);

-- Fix RLS: Allow anonymous users to UPDATE enrolled_count on classes
CREATE POLICY "Public can update enrolled count" ON public.course_classes
  FOR UPDATE TO anon
  USING (status IN ('open', 'full'))
  WITH CHECK (status IN ('open', 'full'));

-- Also allow authenticated users to read course_classes for public pages (they may be logged in)
CREATE POLICY "Authenticated can view open course classes" ON public.course_classes
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users to view active courses (for public page when logged in)
CREATE POLICY "Authenticated can view active courses" ON public.courses
  FOR SELECT TO authenticated
  USING (true);

-- Allow anon to view course categories
-- (already exists, skip if error)

-- Auto-generate slug for courses on insert/update
CREATE OR REPLACE FUNCTION public.generate_course_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(
      regexp_replace(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
    -- Remove accents by translating common chars
    base_slug := translate(base_slug, 'áàâãéèêíìîóòôõúùûüçñ', 'aaaaeeeiiioooouuuucn');
    final_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM public.courses WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_course_slug
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_course_slug();

-- Allow anon to INSERT into course_enrollments (for public enrollment)
-- Allow authenticated to also create enrollments from public page
CREATE POLICY "Public authenticated can create enrollments" ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (true);
