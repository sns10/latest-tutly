# Agent rules

- Automated WhatsApp goes only through the `send-whatsapp` edge function, which fills the center name and parent phone server-side; per-center opt-in and sender live in `tuition_whatsapp_settings` (super-admin write only) so centers can't enable or reroute themselves.
- When the Meta token, phone-number ID and business-account ID server secrets are configured, `send-whatsapp` uses the shared direct Meta sender; otherwise each center selects a `WHATSAPP_API_KEY` or `WHATSAPP_API_KEY_<n>` connector secret by name only, keeping credentials out of settings rows.
- Center editing must wait for WhatsApp settings to load successfully before saving and refresh the WhatsApp settings query after a save, preventing stale opt-in values from overwriting another center's configuration.
