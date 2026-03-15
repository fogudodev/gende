
-- Course categories
CREATE TABLE public.course_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own course categories" ON public.course_categories FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all course categories" ON public.course_categories FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public can view course categories" ON public.course_categories FOR SELECT TO anon USING (true);

-- Courses
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.course_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text,
  short_description text,
  full_description text,
  cover_image_url text,
  workload_hours integer NOT NULL DEFAULT 8,
  modality text NOT NULL DEFAULT 'presencial',
  price numeric NOT NULL DEFAULT 0,
  installments integer NOT NULL DEFAULT 1,
  max_students integer NOT NULL DEFAULT 10,
  syllabus text,
  materials_included text,
  prerequisites text,
  has_certificate boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own courses" ON public.courses FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all courses" ON public.courses FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public can view active courses" ON public.courses FOR SELECT TO anon USING (status = 'active');

-- Course classes (turmas)
CREATE TABLE public.course_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  class_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text,
  modality text NOT NULL DEFAULT 'presencial',
  online_link text,
  max_students integer NOT NULL DEFAULT 10,
  enrolled_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  instructor_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own course classes" ON public.course_classes FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all course classes" ON public.course_classes FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public can view open course classes" ON public.course_classes FOR SELECT TO anon USING (status IN ('open', 'full'));

-- Course enrollments
CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.course_classes(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_phone text,
  student_email text,
  student_cpf text,
  student_city text,
  student_notes text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  enrollment_status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  amount_paid numeric NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  origin text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own enrollments" ON public.course_enrollments FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all enrollments" ON public.course_enrollments FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

-- Course attendance
CREATE TABLE public.course_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.course_classes(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own attendance" ON public.course_attendance FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all attendance" ON public.course_attendance FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

-- Course certificates
CREATE TABLE public.course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  certificate_url text,
  issued_at timestamptz,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'not_issued',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own certificates" ON public.course_certificates FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all certificates" ON public.course_certificates FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

-- Course waitlist
CREATE TABLE public.course_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.course_classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own course waitlist" ON public.course_waitlist FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all course waitlist" ON public.course_waitlist FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

-- Course materials
CREATE TABLE public.course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text,
  material_type text NOT NULL DEFAULT 'pdf',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own course materials" ON public.course_materials FOR ALL TO authenticated USING (professional_id = get_my_professional_id()) WITH CHECK (professional_id = get_my_professional_id());
CREATE POLICY "Admin can manage all course materials" ON public.course_materials FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

-- Add feature flag for courses
INSERT INTO public.feature_flags (key, label, category, enabled, description)
VALUES ('courses', 'Cursos', 'operacional', true, 'Módulo de gestão de cursos e turmas')
ON CONFLICT DO NOTHING;
