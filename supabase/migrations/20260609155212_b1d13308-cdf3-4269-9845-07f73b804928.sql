
REVOKE EXECUTE ON FUNCTION public.edit_fee_payment(uuid, numeric, text, text, text, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_fee_status_manual(uuid, text) FROM PUBLIC, anon;
