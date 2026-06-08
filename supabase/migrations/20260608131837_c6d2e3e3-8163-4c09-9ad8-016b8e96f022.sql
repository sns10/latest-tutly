
CREATE OR REPLACE FUNCTION public.record_fee_payment(
  p_fee_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_paid numeric;
  v_fee_amount numeric;
  v_new_status text;
  v_paid_date date;
  v_fee_tuition uuid;
  v_user_tuition uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT s.tuition_id, sf.amount
    INTO v_fee_tuition, v_fee_amount
  FROM student_fees sf
  JOIN students s ON s.id = sf.student_id
  WHERE sf.id = p_fee_id
  FOR UPDATE OF sf;

  IF v_fee_tuition IS NULL THEN
    RAISE EXCEPTION 'Fee not found';
  END IF;

  v_user_tuition := public.get_user_tuition_id(auth.uid());
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role)
     AND v_fee_tuition <> v_user_tuition THEN
    RAISE EXCEPTION 'Access denied: fee belongs to another tuition';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM fee_payments WHERE fee_id = p_fee_id;

  IF v_total_paid + p_amount > v_fee_amount THEN
    RAISE EXCEPTION 'Overpayment: total payments (%) would exceed fee amount (%)',
      v_total_paid + p_amount, v_fee_amount;
  END IF;

  INSERT INTO fee_payments (fee_id, amount, payment_method, payment_reference, notes, payment_date)
  VALUES (p_fee_id, p_amount, p_payment_method, p_reference, p_notes, p_payment_date);

  v_total_paid := v_total_paid + p_amount;

  IF v_total_paid >= v_fee_amount THEN
    v_new_status := 'paid';
    v_paid_date := p_payment_date;
  ELSE
    v_new_status := 'partial';
    v_paid_date := NULL;
  END IF;

  UPDATE student_fees
  SET status = v_new_status, paid_date = v_paid_date, updated_at = now()
  WHERE id = p_fee_id;

  RETURN jsonb_build_object(
    'totalPaid', v_total_paid,
    'feeAmount', v_fee_amount,
    'newStatus', v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_fee_payment(uuid, numeric, text, text, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.void_fee_payments(p_fee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_tuition uuid;
  v_user_tuition uuid;
  v_deleted integer;
BEGIN
  SELECT s.tuition_id INTO v_fee_tuition
  FROM student_fees sf
  JOIN students s ON s.id = sf.student_id
  WHERE sf.id = p_fee_id
  FOR UPDATE OF sf;

  IF v_fee_tuition IS NULL THEN
    RAISE EXCEPTION 'Fee not found';
  END IF;

  v_user_tuition := public.get_user_tuition_id(auth.uid());
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role)
     AND v_fee_tuition <> v_user_tuition THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM fee_payments WHERE fee_id = p_fee_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  UPDATE student_fees
  SET status = 'unpaid', paid_date = NULL, updated_at = now()
  WHERE id = p_fee_id;

  RETURN jsonb_build_object('deleted', v_deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_fee_payments(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.void_fee_payment(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_id uuid;
  v_fee_tuition uuid;
  v_user_tuition uuid;
  v_fee_amount numeric;
  v_total_paid numeric;
  v_new_status text;
  v_paid_date date;
BEGIN
  SELECT fp.fee_id INTO v_fee_id
  FROM fee_payments fp WHERE fp.id = p_payment_id;

  IF v_fee_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  SELECT s.tuition_id, sf.amount INTO v_fee_tuition, v_fee_amount
  FROM student_fees sf
  JOIN students s ON s.id = sf.student_id
  WHERE sf.id = v_fee_id
  FOR UPDATE OF sf;

  v_user_tuition := public.get_user_tuition_id(auth.uid());
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role)
     AND v_fee_tuition <> v_user_tuition THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM fee_payments WHERE id = p_payment_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM fee_payments WHERE fee_id = v_fee_id;

  IF v_total_paid = 0 THEN
    v_new_status := 'unpaid';
    v_paid_date := NULL;
  ELSIF v_total_paid >= v_fee_amount THEN
    v_new_status := 'paid';
    SELECT MAX(payment_date) INTO v_paid_date FROM fee_payments WHERE fee_id = v_fee_id;
  ELSE
    v_new_status := 'partial';
    v_paid_date := NULL;
  END IF;

  UPDATE student_fees
  SET status = v_new_status, paid_date = v_paid_date, updated_at = now()
  WHERE id = v_fee_id;

  RETURN jsonb_build_object(
    'feeId', v_fee_id,
    'totalPaid', v_total_paid,
    'newStatus', v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_fee_payment(uuid) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_student_monthly_fee
  ON public.student_fees (student_id, fee_type)
  WHERE fee_type LIKE 'Monthly Fee - %';
