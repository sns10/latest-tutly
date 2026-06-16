DROP FUNCTION IF EXISTS public.bulk_mark_attendance(jsonb);

CREATE OR REPLACE FUNCTION public.bulk_mark_attendance(_records jsonb)
RETURNS SETOF public.student_attendance
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

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_records) AS payload(rec)
    WHERE payload.rec->>'status' NOT IN ('present', 'absent', 'late', 'excused')
  ) THEN
    RAISE EXCEPTION 'Invalid attendance status in bulk records';
  END IF;

  v_is_super := public.has_role(auth.uid(), 'super_admin'::app_role);
  v_user_tuition := public.get_user_tuition_id(auth.uid());

  SELECT ARRAY(
    SELECT DISTINCT (payload.rec->>'student_id')::uuid
    FROM jsonb_array_elements(_records) AS payload(rec)
  )
  INTO v_student_ids;

  IF NOT v_is_super THEN
    IF v_user_tuition IS NULL THEN
      RAISE EXCEPTION 'No tuition associated with user';
    END IF;

    SELECT COUNT(*) INTO v_bad_count
    FROM unnest(v_student_ids) AS input_students(input_student_id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.students AS s
      WHERE s.id = input_students.input_student_id
        AND s.tuition_id = v_user_tuition
    );

    IF v_bad_count > 0 THEN
      RAISE EXCEPTION 'Access denied: % student(s) outside your tuition', v_bad_count;
    END IF;
  END IF;

  RETURN QUERY
  WITH raw_input AS (
    SELECT
      (payload.rec->>'student_id')::uuid           AS rec_student_id,
      (payload.rec->>'date')::date                 AS rec_attendance_date,
      payload.rec->>'status'                       AS rec_attendance_status,
      NULLIF(payload.rec->>'notes', '')            AS rec_notes,
      NULLIF(payload.rec->>'subject_id', '')::uuid AS rec_subject_id,
      NULLIF(payload.rec->>'faculty_id', '')::uuid AS rec_faculty_id,
      payload.ordinality                           AS rec_pos
    FROM jsonb_array_elements(_records) WITH ORDINALITY AS payload(rec, ordinality)
  ),
  deduped AS (
    SELECT DISTINCT ON (
      raw_input.rec_student_id,
      raw_input.rec_attendance_date,
      COALESCE(raw_input.rec_subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(raw_input.rec_faculty_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
      raw_input.rec_student_id,
      raw_input.rec_attendance_date,
      raw_input.rec_attendance_status,
      raw_input.rec_notes,
      raw_input.rec_subject_id,
      raw_input.rec_faculty_id
    FROM raw_input
    ORDER BY
      raw_input.rec_student_id,
      raw_input.rec_attendance_date,
      COALESCE(raw_input.rec_subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(raw_input.rec_faculty_id, '00000000-0000-0000-0000-000000000000'::uuid),
      raw_input.rec_pos DESC
  ),
  upserted AS (
    INSERT INTO public.student_attendance AS target_attendance
      (student_id, date, status, notes, subject_id, faculty_id)
    SELECT
      deduped.rec_student_id,
      deduped.rec_attendance_date,
      deduped.rec_attendance_status,
      deduped.rec_notes,
      deduped.rec_subject_id,
      deduped.rec_faculty_id
    FROM deduped
    ON CONFLICT (
      student_id,
      date,
      COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(faculty_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    DO UPDATE SET
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = now()
    RETURNING target_attendance.*
  )
  SELECT upserted.*
  FROM upserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_mark_attendance(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_mark_attendance(jsonb) TO service_role;