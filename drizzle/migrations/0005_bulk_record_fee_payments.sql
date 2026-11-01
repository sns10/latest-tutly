CREATE OR REPLACE FUNCTION public.bulk_record_fee_payments(_records jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  v_ok int := 0;
  v_failed jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(_records) <> 'array' OR jsonb_array_length(_records) > 500 THEN
    RAISE EXCEPTION 'Provide an array of at most 500 payments';
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(_records) LOOP
    BEGIN
      PERFORM public.record_fee_payment(
        (r->>'fee_id')::uuid,
        (r->>'amount')::numeric,
        COALESCE(NULLIF(r->>'payment_method',''), 'cash'),
        NULLIF(r->>'reference',''),
        NULLIF(r->>'notes',''),
        COALESCE(NULLIF(r->>'payment_date','')::date, CURRENT_DATE)
      );
      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed || jsonb_build_object('fee_id', r->>'fee_id', 'error', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('recorded', v_ok, 'failed', v_failed);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bulk_record_fee_payments(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_record_fee_payments(jsonb) TO authenticated;