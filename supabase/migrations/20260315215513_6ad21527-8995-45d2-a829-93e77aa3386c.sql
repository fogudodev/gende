
-- Create a secure function to handle enrollment atomically and prevent overbooking
CREATE OR REPLACE FUNCTION public.enroll_student_in_class(
  p_professional_id uuid,
  p_course_id uuid,
  p_class_id uuid,
  p_student_name text,
  p_student_phone text,
  p_student_email text DEFAULT NULL,
  p_student_cpf text DEFAULT NULL,
  p_student_city text DEFAULT NULL,
  p_student_notes text DEFAULT NULL,
  p_origin text DEFAULT 'public_page'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_class record;
  v_enrollment_id uuid;
BEGIN
  -- Lock the class row to prevent race conditions
  SELECT * INTO v_class FROM public.course_classes
  WHERE id = p_class_id AND professional_id = p_professional_id
  FOR UPDATE;

  IF v_class IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Turma não encontrada');
  END IF;

  IF v_class.status NOT IN ('open') THEN
    RETURN json_build_object('success', false, 'error', 'Turma não está aberta para inscrições');
  END IF;

  -- Check capacity
  IF v_class.enrolled_count >= v_class.max_students THEN
    -- Add to waitlist instead
    INSERT INTO public.course_waitlist (professional_id, class_id, name, phone, email)
    VALUES (p_professional_id, p_class_id, p_student_name, p_student_phone, p_student_email);
    RETURN json_build_object('success', true, 'waitlist', true);
  END IF;

  -- Insert enrollment
  INSERT INTO public.course_enrollments (
    professional_id, course_id, class_id,
    student_name, student_phone, student_email, student_cpf, student_city, student_notes,
    enrollment_status, payment_status, amount_paid, origin
  ) VALUES (
    p_professional_id, p_course_id, p_class_id,
    p_student_name, p_student_phone, p_student_email, p_student_cpf, p_student_city, p_student_notes,
    'pending', 'pending', 0, p_origin
  ) RETURNING id INTO v_enrollment_id;

  -- Update enrolled count
  UPDATE public.course_classes
  SET enrolled_count = enrolled_count + 1,
      status = CASE WHEN enrolled_count + 1 >= max_students THEN 'full' ELSE status END
  WHERE id = p_class_id;

  RETURN json_build_object('success', true, 'waitlist', false, 'enrollment_id', v_enrollment_id);
END;
$$;
