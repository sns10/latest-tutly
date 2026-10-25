# WhatsApp delivery tracking

## What you and the centers get
- Every WhatsApp message Tutly sends shows a live status: **Sent**, **Delivered**, **Read** or **Failed**. Failed messages also show Meta's reason, for example "Recipient not on WhatsApp" or "Message undeliverable".
- **Fees page:** a new **WhatsApp history** button lists recent reminders with the student, the parent's number (last 4 digits), the time sent and the status. You can filter by status, and it refreshes on its own.
- **Bulk send summary:** after a batch is sent, the summary keeps updating, so students move from Sent to Delivered or Read while it is open.
- Each center only sees its own messages. You see all of them as super admin.

## What you'll need to do once in Meta
After I build this, I'll give you:
1. a **callback link**
2. a **verify code**

Paste both into your Meta app under WhatsApp → Configuration → Webhook, then subscribe to the **messages** field. I'll also ask you, through a secure form, for your Meta **App Secret**, so Tutly accepts only updates that really come from Meta.

## Technical details
- Migration: add `delivery_status` (sent/delivered/read/failed), `delivered_at`, `read_at`, `failed_at`, `error_code` and `status_updated_at` to `whatsapp_logs`, with an index on `message_id`. The existing read policy stays.
- New public edge function `whatsapp-webhook` (`verify_jwt = false`):
  - **GET:** return `hub.challenge` when `hub.verify_token` matches the secret `META_WEBHOOK_VERIFY_TOKEN`.
  - **POST:** check `X-Hub-Signature-256` against `META_APP_SECRET`. For each `statuses[]` item, update the row matching `message_id = id` with the service role. Statuses only move forward (sent < delivered < read), but failed always applies with `errors[0].title/message/code`. Reply 200 quickly.
- Secrets: generate `META_WEBHOOK_VERIFY_TOKEN`, and request `META_APP_SECRET`.
- Frontend: a `useWhatsAppLogs(tuitionId)` query that refreshes every 15 seconds while open, plus `WhatsAppHistoryDialog.tsx` (mobile-safe, `max-h-[90vh]`) opened from the Fees toolbar. The bulk dialog's result view reads statuses for its message IDs.
- Messages sent before this change have no delivery updates and stay "Sent".
