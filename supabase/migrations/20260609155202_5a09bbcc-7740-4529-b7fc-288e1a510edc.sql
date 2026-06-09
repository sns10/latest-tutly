
-- Edit an existing fee payment, then recompute the parent fee's status.
CREATE OR REPLACE FUNCTION public.edit_fee_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fee_id uuid;
  v_fee_tuition uuid;
  v_user_tuition uuid;
  v_fee_amount numeric;
  v_total_paid numeric;
  v_other_paid numeric;
  v_new_status text;
  v_paid_date date;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT fp.fee_id, to_jsonb(fp.*)
    INTO v_fee_id, v_old
  FROM fee_payments fp
  WHERE fp.id = p_payment_id
  FOR UPDATE;

  IF v_fee_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  SELECT s.tuition_id, sf.amount
    INTO v_fee_tuition, v_fee_amount
  FROM student_fees sf
  JOIN students s ON s.id = sf.student_id
  WHERE sf.id = v_fee_id
  FOR UPDATE OF sf;

  v_user_tuition := public.get_user_tuition_id(auth.uid());
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role)
     AND v_fee_tuition <> v_user_tuition THEN
    RAISE EXCEPTION 'Access denied: payment belongs to another tuition';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_other_paid
  FROM fee_payments WHERE fee_id = v_fee_id AND id <> p_payment_id;

  IF v_other_paid + p_amount > v_fee_amount THEN
    RAISE EXCEPTION 'Overpayment: total payments (%) would exceed fee amount (%)',
      v_other_paid + p_amount, v_fee_amount;
  END IF;

  UPDATE fee_payments
  SET amount = p_amount,
      payment_method = p_payment_method,
      payment_reference = p_reference,
      notes = p_notes,
      payment_date = COALESCE(p_payment_date, payment_date)
  WHERE id = p_payment_id;

  v_total_paid := v_other_paid + p_amount;

  IF v_total_paid >= v_fee_amount THEN
    v_new_status := 'paid';
    SELECT MAX(payment_date) INTO v_paid_date FROM fee_payments WHERE fee_id = v_fee_id;
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
    v_paid_date := NULL;
  ELSE
    v_new_status := 'unpaid';
    v_paid_date := NULL;
  END IF;

  UPDATE student_fees
  SET status = v_new_status, paid_date = v_paid_date, updated_at = now()
  WHERE id = v_fee_id;

  SELECT to_jsonb(fp.*) INTO v_new FROM fee_payments fp WHERE fp.id = p_payment_id;

  INSERT INTO audit_logs (tuition_id, user_id, action, entity_type, entity_id, details)
  VALUES (
    v_fee_tuition, auth.uid(), 'edit_fee_payment', 'fee_payment', p_payment_id,
    jsonb_build_object('before', v_old, 'after', v_new, 'fee_id', v_fee_id, 'newStatus', v_new_status)
  );

  RETURN jsonb_build_object(
    'feeId', v_fee_id,
    'totalPaid', v_total_paid,
    'newStatus', v_new_status
  );
END;
$$;

-- Manually set a fee's status to 'paid' or 'unpaid' WITHOUT recording a payment.
-- Only allowed when the fee has no payment entries — preserves ledger integrity.
CREATE OR REPLACE FUNCTION public.set_fee_status_manual(
  p_fee_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fee_tuition uuid;
  v_user_tuition uuid;
  v_payment_count integer;
  v_paid_date date;
  v_old_status text;
BEGIN
  IF p_status NOT IN ('paid', 'unpaid') THEN
    RAISE EXCEPTION 'Status must be paid or unpaid';
  END IF;

  SELECT s.tuition_id, sf.status
    INTO v_fee_tuition, v_old_status
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

  SELECT COUNT(*) INTO v_payment_count FROM fee_payments WHERE fee_id = p_fee_id;
  IF v_payment_count > 0 THEN
    RAISE EXCEPTION 'This fee has % payment(s). Void the payments first before toggling status manually.', v_payment_count;
  END IF;

  v_paid_date := CASE WHEN p_status = 'paid' THEN CURRENT_DATE ELSE NULL END;

  UPDATE student_fees
  SET status = p_status, paid_date = v_paid_date, updated_at = now()
  WHERE id = p_fee_id;

  INSERT INTO audit_logs (tuition_id, user_id, action, entity_type, entity_id, details)
  VALUES (
    v_fee_tuition, auth.uid(), 'set_fee_status_manual', 'student_fee', p_fee_id,
    jsonb_build_object('from', v_old_status, 'to', p_status)
  );

  RETURN jsonb_build_object('feeId', p_fee_id, 'newStatus', p_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.edit_fee_payment(uuid, numeric, text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_fee_status_manual(uuid, text) TO authenticated;
