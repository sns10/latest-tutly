
CREATE OR REPLACE FUNCTION public.bulk_mark_attendance(_records jsonb)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  date date,
  status text,
  notes text,
  subject_id uuid,
  faculty_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tuition uuid;
  v_is_super boolean;
  v_student_ids uuid[];
  v_bad_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _records IS NULL OR jsonb_typeof(_records) <> 'array' OR jsonb_array_length(_records) = 0 THEN
    RETURN;
  END IF;

  v_is_super := public.has_role(auth.uid(), 'super_admin'::app_role);
  v_user_tuition := public.get_user_tuition_id(auth.uid());

  -- Collect all student_ids from input
  SELECT ARRAY(SELECT DISTINCT (rec->>'student_id')::uuid FROM jsonb_array_elements(_records) rec)
    INTO v_student_ids;

  -- Tuition ownership check (super admin bypasses)
  IF NOT v_is_super THEN
    IF v_user_tuition IS NULL THEN
      RAISE EXCEPTION 'No tuition associated with user';
    END IF;

    SELECT COUNT(*) INTO v_bad_count
    FROM unnest(v_student_ids) sid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = sid AND s.tuition_id = v_user_tuition
    );

    IF v_bad_count > 0 THEN
      RAISE EXCEPTION 'Access denied: % student(s) outside your tuition', v_bad_count;
    END IF;
  END IF;

  RETURN QUERY
  WITH input AS (
    SELECT
      (rec->>'student_id')::uuid AS student_id,
      (rec->>'date')::date       AS date,
       rec->>'status'             AS status,
       NULLIF(rec->>'notes', '')  AS notes,
       NULLIF(rec->>'subject_id', '')::uuid AS subject_id,
       NULLIF(rec->>'faculty_id', '')::uuid AS faculty_id
    FROM jsonb_array_elements(_records) rec
  ),
  upserted AS (
    INSERT INTO public.student_attendance AS sa
      (student_id, date, status, notes, subject_id, faculty_id)
    SELECT student_id, date, status, notes, subject_id, faculty_id FROM input
    ON CONFLICT (
      student_id,
      date,
      COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(faculty_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    DO UPDATE SET
      status = EXCLUDED.status,
      notes  = EXCLUDED.notes,
      updated_at = now()
    RETURNING sa.id, sa.student_id, sa.date, sa.status, sa.notes,
              sa.subject_id, sa.faculty_id, sa.created_at, sa.updated_at
  )
  SELECT * FROM upserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_mark_attendance(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_mark_attendance(jsonb) TO service_role;
