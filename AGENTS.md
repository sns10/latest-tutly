# Agent rules

- Automated WhatsApp goes only through the `send-whatsapp` edge function, which fills the center name and parent phone server-side; per-center opt-in and sender live in `tuition_whatsapp_settings` (super-admin write only) so centers can't enable or reroute themselves.
- Each center's WhatsApp sender is a server secret named `WHATSAPP_API_KEY` (shared) or `WHATSAPP_API_KEY_<n>` (dedicated); the settings row stores only the secret name, never the key.
