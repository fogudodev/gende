
CREATE OR REPLACE FUNCTION public.get_available_slots(p_professional_id uuid, p_service_id uuid, p_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service record;
  v_working record;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_day_of_week integer;
  v_conflict_count integer;
  v_blocked_count integer;
  v_slots json[];
  v_tz text := 'America/Sao_Paulo';
BEGIN
  SELECT * INTO v_service FROM public.services
  WHERE id = p_service_id AND professional_id = p_professional_id AND active = true;
  IF v_service IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Serviço não encontrado');
  END IF;

  -- Use São Paulo timezone for day_of_week calculation
  v_day_of_week := EXTRACT(DOW FROM p_date);
  SELECT * INTO v_working FROM public.working_hours
  WHERE professional_id = p_professional_id AND day_of_week = v_day_of_week AND is_active = true;
  IF v_working IS NULL THEN
    RETURN json_build_object('success', true, 'slots', '[]'::json);
  END IF;

  -- Combine date + time IN the São Paulo timezone, then convert to timestamptz
  v_slot_start := (p_date || ' ' || v_working.start_time)::timestamp AT TIME ZONE v_tz;
  v_slots := ARRAY[]::json[];

  WHILE (v_slot_start + (v_service.duration_minutes || ' minutes')::interval) <= ((p_date || ' ' || v_working.end_time)::timestamp AT TIME ZONE v_tz) LOOP
    v_slot_end := v_slot_start + (v_service.duration_minutes || ' minutes')::interval;
    SELECT COUNT(*) INTO v_conflict_count FROM public.bookings
    WHERE professional_id = p_professional_id AND status NOT IN ('cancelled')
      AND (v_slot_start, v_slot_end) OVERLAPS (start_time, end_time);
    SELECT COUNT(*) INTO v_blocked_count FROM public.blocked_times
    WHERE professional_id = p_professional_id
      AND (v_slot_start, v_slot_end) OVERLAPS (start_time, end_time);
    IF v_conflict_count = 0 AND v_blocked_count = 0 THEN
      v_slots := array_append(v_slots, json_build_object('start_time', v_slot_start, 'end_time', v_slot_end));
    END IF;
    v_slot_start := v_slot_start + interval '30 minutes';
  END LOOP;

  RETURN json_build_object('success', true, 'slots', array_to_json(v_slots));
END;
$function$;

-- Also fix create_public_booking to use São Paulo timezone
CREATE OR REPLACE FUNCTION public.create_public_booking(p_professional_id uuid, p_service_id uuid, p_start_time timestamp with time zone, p_client_name text, p_client_phone text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service record;
  v_end_time timestamptz;
  v_day_of_week integer;
  v_start_time_of_day time;
  v_end_time_of_day time;
  v_working record;
  v_conflict_count integer;
  v_blocked_count integer;
  v_booking_id uuid;
  v_client_id uuid;
  v_tz text := 'America/Sao_Paulo';
BEGIN
  SELECT * INTO v_service FROM public.services
  WHERE id = p_service_id AND professional_id = p_professional_id AND active = true;
  IF v_service IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Serviço não encontrado ou inativo');
  END IF;

  v_end_time := p_start_time + (v_service.duration_minutes || ' minutes')::interval;
  
  -- Extract day and time in São Paulo timezone
  v_day_of_week := EXTRACT(DOW FROM p_start_time AT TIME ZONE v_tz);
  v_start_time_of_day := (p_start_time AT TIME ZONE v_tz)::time;
  v_end_time_of_day := (v_end_time AT TIME ZONE v_tz)::time;

  SELECT * INTO v_working FROM public.working_hours
  WHERE professional_id = p_professional_id AND day_of_week = v_day_of_week AND is_active = true;
  IF v_working IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profissional não trabalha neste dia');
  END IF;
  IF v_start_time_of_day < v_working.start_time OR v_end_time_of_day > v_working.end_time THEN
    RETURN json_build_object('success', false, 'error', 'Horário fora do expediente');
  END IF;

  SELECT COUNT(*) INTO v_conflict_count FROM public.bookings
  WHERE professional_id = p_professional_id AND status NOT IN ('cancelled')
    AND (p_start_time, v_end_time) OVERLAPS (start_time, end_time);
  IF v_conflict_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Horário já ocupado');
  END IF;

  SELECT COUNT(*) INTO v_blocked_count FROM public.blocked_times
  WHERE professional_id = p_professional_id
    AND (p_start_time, v_end_time) OVERLAPS (start_time, end_time);
  IF v_blocked_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Horário bloqueado pelo profissional');
  END IF;

  SELECT id INTO v_client_id FROM public.clients
  WHERE professional_id = p_professional_id AND phone = p_client_phone LIMIT 1;
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (professional_id, name, phone)
    VALUES (p_professional_id, p_client_name, p_client_phone)
    RETURNING id INTO v_client_id;
  END IF;

  INSERT INTO public.bookings (
    professional_id, client_id, service_id, start_time, end_time, status,
    price, duration_minutes, client_name, client_phone
  ) VALUES (
    p_professional_id, v_client_id, p_service_id, p_start_time, v_end_time, 'pending',
    v_service.price, v_service.duration_minutes, p_client_name, p_client_phone
  ) RETURNING id INTO v_booking_id;

  RETURN json_build_object('success', true, 'booking_id', v_booking_id, 'price', v_service.price, 'duration_minutes', v_service.duration_minutes, 'end_time', v_end_time);
END;
$function$;
