CREATE OR REPLACE FUNCTION public.get_class_outstanding_report(_tuition_id uuid, _class text, _division_id uuid, _from date, _to date)
RETURNS TABLE(student_id uuid, name text, roll_no integer, class text, division_id uuid, phone text,
  missed_months text[], missed_count integer, paid_total numeric, outstanding numeric, late_fee numeric, last_payment_date date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'tuition_admin') AND public.get_user_tuition_id(auth.uid()) = _tuition_id)) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  RETURN QUERY
  WITH f AS (
    SELECT sf.id, sf.student_id, sf.due_date, sf.status,
      GREATEST(sf.amount - COALESCE(sf.discount_amount,0), 0) AS net,
      COALESCE((SELECT SUM(p.amount) FROM fee_payments p WHERE p.fee_id = sf.id),0) AS paid,
      (SELECT MAX(p.payment_date) FROM fee_payments p WHERE p.fee_id = sf.id) AS last_pay
    FROM student_fees sf JOIN students s ON s.id = sf.student_id
    WHERE s.tuition_id = _tuition_id AND (_class IS NULL OR s.class = _class)
      AND (_division_id IS NULL OR s.division_id = _division_id)
      AND sf.due_date BETWEEN _from AND _to
  ), f2 AS (
    SELECT f.*, CASE WHEN f.status = 'paid' THEN 0 ELSE GREATEST(f.net - f.paid, 0) END AS bal FROM f
  ), agg AS (
    SELECT f2.student_id AS sid,
      array_agg(DISTINCT to_char(f2.due_date, 'YYYY-MM')) FILTER (WHERE f2.bal > 0) AS months,
      SUM(f2.paid) AS paid_sum, SUM(f2.bal) AS bal_sum,
      SUM(CASE WHEN f2.bal > 0 AND f2.due_date < CURRENT_DATE THEN 1 ELSE 0 END) AS overdue_n,
      SUM(CASE WHEN f2.bal > 0 AND f2.due_date < CURRENT_DATE THEN f2.bal ELSE 0 END) AS overdue_bal,
      MAX(f2.last_pay) AS last_pay
    FROM f2 GROUP BY f2.student_id
  )
  SELECT s.id, s.name, s.roll_no, s.class, s.division_id,
    COALESCE(s.father_phone, s.mother_phone, s.parent_phone, s.phone),
    COALESCE(a.months, '{}'), COALESCE(array_length(a.months,1),0), a.paid_sum, a.bal_sum,
    ROUND(COALESCE(cf.late_fee_amount,0) * a.overdue_n + COALESCE(cf.late_fee_percentage,0) / 100 * a.overdue_bal, 2),
    (SELECT MAX(p.payment_date) FROM fee_payments p JOIN student_fees x ON x.id = p.fee_id WHERE x.student_id = s.id)
  FROM agg a JOIN students s ON s.id = a.sid
  LEFT JOIN class_fees cf ON cf.tuition_id = _tuition_id AND cf.class = s.class
  WHERE a.bal_sum > 0
  ORDER BY a.bal_sum DESC;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_class_outstanding_report(uuid,text,uuid,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_outstanding_report(uuid,text,uuid,date,date) TO authenticated;