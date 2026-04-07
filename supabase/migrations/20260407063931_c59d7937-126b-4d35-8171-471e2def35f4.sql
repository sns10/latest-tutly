
CREATE OR REPLACE FUNCTION public.record_fee_payment(
  p_fee_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
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
BEGIN
  -- Insert payment
  INSERT INTO fee_payments (fee_id, amount, payment_method, payment_reference, notes)
  VALUES (p_fee_id, p_amount, p_payment_method, p_reference, p_notes);

  -- Calculate total paid (atomic within transaction)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM fee_payments WHERE fee_id = p_fee_id;

  -- Get fee amount
  SELECT amount INTO v_fee_amount
  FROM student_fees WHERE id = p_fee_id;

  -- Determine status
  IF v_total_paid >= v_fee_amount THEN
    v_new_status := 'paid';
    v_paid_date := CURRENT_DATE;
  ELSE
    v_new_status := 'partial';
    v_paid_date := NULL;
  END IF;

  -- Update fee status
  UPDATE student_fees
  SET status = v_new_status, paid_date = v_paid_date
  WHERE id = p_fee_id;

  RETURN jsonb_build_object(
    'totalPaid', v_total_paid,
    'feeAmount', v_fee_amount,
    'newStatus', v_new_status
  );
END;
$$;
