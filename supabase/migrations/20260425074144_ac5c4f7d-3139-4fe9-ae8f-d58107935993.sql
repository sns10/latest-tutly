
-- 1. Composite indexes for scale
CREATE INDEX IF NOT EXISTS idx_student_fees_tuition_due
  ON public.student_fees (student_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_student_attendance_date_student
  ON public.student_attendance (date DESC, student_id);

-- 2. Maintenance: mark unpaid fees with passed due_date as overdue
CREATE OR REPLACE FUNCTION public.mark_overdue_fees()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.student_fees
  SET status = 'overdue', updated_at = now()
  WHERE status = 'unpaid'
    AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_overdue_fees() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_overdue_fees() TO authenticated;

-- 3. Dashboard aggregate: returns counters in a single round-trip
CREATE OR REPLACE FUNCTION public.get_tuition_dashboard_stats(
  _tuition_id uuid,
  _month_start date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  _month_end date DEFAULT (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date,
  _today date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_collected numeric;
  v_total_pending numeric;
  v_overdue_count integer;
  v_present_today integer;
  v_absent_today integer;
  v_late_today integer;
  v_marked_today_classes integer;
BEGIN
  -- Authorization: super_admin OR tuition_admin of this tuition OR student/portal of this tuition
  IF NOT (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (has_role(auth.uid(), 'tuition_admin'::app_role) AND _tuition_id = get_user_tuition_id(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  -- Fee collection this month (sum of payments)
  SELECT COALESCE(SUM(fp.amount), 0) INTO v_total_collected
  FROM fee_payments fp
  JOIN student_fees sf ON sf.id = fp.fee_id
  JOIN students s ON s.id = sf.student_id
  WHERE s.tuition_id = _tuition_id
    AND fp.payment_date BETWEEN _month_start AND _month_end;

  -- Pending fee amount across the tuition (unpaid + partial + overdue)
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

  -- Overdue count (derived live: unpaid AND due_date < today, OR status = overdue)
  SELECT COUNT(*) INTO v_overdue_count
  FROM student_fees sf
  JOIN students s ON s.id = sf.student_id
  WHERE s.tuition_id = _tuition_id
    AND (sf.status = 'overdue'
         OR (sf.status = 'unpaid' AND sf.due_date < _today));

  -- Today's attendance counters
  SELECT
    COUNT(*) FILTER (WHERE sa.status = 'present'),
    COUNT(*) FILTER (WHERE sa.status = 'absent'),
    COUNT(*) FILTER (WHERE sa.status = 'late'),
    COUNT(DISTINCT (sa.subject_id, sa.faculty_id))
  INTO v_present_today, v_absent_today, v_late_today, v_marked_today_classes
  FROM student_attendance sa
  JOIN students s ON s.id = sa.student_id
  WHERE s.tuition_id = _tuition_id
    AND sa.date = _today;

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
$$;

REVOKE ALL ON FUNCTION public.get_tuition_dashboard_stats(uuid, date, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tuition_dashboard_stats(uuid, date, date, date) TO authenticated;
