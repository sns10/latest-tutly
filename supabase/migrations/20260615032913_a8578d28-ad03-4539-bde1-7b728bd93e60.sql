CREATE OR REPLACE FUNCTION public.get_tuition_dashboard_stats(_tuition_id uuid, _month_start date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date, _month_end date DEFAULT ((date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) + '1 mon -1 days'::interval))::date, _today date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_collected numeric;
  v_total_pending numeric;
  v_overdue_count integer;
  v_present_today integer;
  v_absent_today integer;
  v_late_today integer;
  v_marked_today_classes integer;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (has_role(auth.uid(), 'tuition_admin'::app_role) AND _tuition_id = get_user_tuition_id(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT COALESCE(SUM(fp.amount), 0) INTO v_total_collected
  FROM fee_payments fp
  JOIN student_fees sf ON sf.id = fp.fee_id
  JOIN students s ON s.id = sf.student_id
  WHERE s.tuition_id = _tuition_id
    AND fp.payment_date BETWEEN _month_start AND _month_end;

  SELECT COALESCE(SUM(
    sf.amount
    - COALESCE((SELECT SUM(amount) FROM fee_payments WHERE fee_id = sf.id), 0)
    - COALESCE(sf.discount_amount, 0)
  ), 0)
  INTO v_total_pending
  FROM student_fees sf
  JOIN students s ON s.id = sf.student_id
  WHERE s.tuition_id = _tuition_id
    AND sf.status IN ('unpaid', 'partial', 'overdue');

  SELECT COUNT(*) INTO v_overdue_count
  FROM student_fees sf
  JOIN students s ON s.id = sf.student_id
  WHERE s.tuition_id = _tuition_id
    AND (sf.status = 'overdue'
         OR (sf.status = 'unpaid' AND sf.due_date < _today));

  WITH student_day_status AS (
    SELECT
      sa.student_id,
      CASE
        WHEN BOOL_OR(sa.status = 'present') THEN 'present'
        WHEN BOOL_OR(sa.status = 'late') THEN 'late'
        WHEN BOOL_OR(sa.status = 'excused') THEN 'excused'
        ELSE 'absent'
      END AS day_status
    FROM student_attendance sa
    JOIN students s ON s.id = sa.student_id
    WHERE s.tuition_id = _tuition_id
      AND sa.date = _today
    GROUP BY sa.student_id
  )
  SELECT
    COUNT(*) FILTER (WHERE day_status = 'present'),
    COUNT(*) FILTER (WHERE day_status = 'absent'),
    COUNT(*) FILTER (WHERE day_status = 'late')
  INTO v_present_today, v_absent_today, v_late_today
  FROM student_day_status;

  SELECT COUNT(DISTINCT (sa.subject_id, sa.faculty_id))
  INTO v_marked_today_classes
  FROM student_attendance sa
  JOIN students s ON s.id = sa.student_id
  WHERE s.tuition_id = _tuition_id
    AND sa.date = _today
    AND sa.subject_id IS NOT NULL
    AND sa.faculty_id IS NOT NULL;

  RETURN jsonb_build_object(
    'totalCollected', v_total_collected,
    'totalPending', v_total_pending,
    'overdueCount', v_overdue_count,
    'presentToday', v_present_today,
    'absentToday', v_absent_today,
    'lateToday', v_late_today,
    'markedTodayClasses', v_marked_today_classes,
    'monthStart', _month_start,
    'monthEnd', _month_end,
    'today', _today
  );
END;
$function$;