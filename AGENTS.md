# Agent rules

- Student roster PDF exports use a client-side selectable-column generator and paginated tables with horizontal column continuation, so wide exports remain readable without changing student records.

- Automated WhatsApp goes only through the `send-whatsapp` edge function, which fills the center name and parent phone server-side; per-center opt-in and sender live in `tuition_whatsapp_settings` (super-admin write only) so centers can't enable or reroute themselves.
- When the Meta token, phone-number ID and business-account ID server secrets are configured, `send-whatsapp` uses the shared direct Meta sender; otherwise each center selects a `WHATSAPP_API_KEY` or `WHATSAPP_API_KEY_<n>` connector secret by name only, keeping credentials out of settings rows.
- Center editing must wait for WhatsApp settings to load successfully before saving and refresh the WhatsApp settings query after a save, preventing stale opt-in values from overwriting another center's configuration.
- WhatsApp delivery statuses arrive only via the public `whatsapp-webhook` function, which verifies Meta's HMAC signature with `META_APP_SECRET` and updates `whatsapp_logs` by `message_id` with forward-only status (failed always wins), so forged or out-of-order callbacks can't corrupt history.
- Scheduled WhatsApp batches are rows in `whatsapp_scheduled_dispatches` (date only) sent by the once-daily `dispatch-scheduled-whatsapp` cron; it sends in budgeted chunks, saves `progress_offset` after each chunk, re-invokes itself only while due work remains, and resets stale `processing` rows, so large batches finish without re-sending or extra timers.
- WhatsApp and usage counts come from SECURITY DEFINER aggregate RPCs (`get_whatsapp_stats`, super-admin-only `get_platform_usage`), never from client-side counting of capped log lists, so totals stay exact at any volume.
- Bulk fee payments go through the `bulk_record_fee_payments` RPC, which calls `record_fee_payment` per row so the same overpayment and tenant checks apply and one bad row never blocks the rest.
