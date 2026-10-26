# Super Admin WhatsApp & Usage Analytics + Hardening

## What you get

A new **Usage & Analytics** section on the Super Admin dashboard, with one row per tuition center:

- Center name, plan status, and whether WhatsApp is on
- Students, faculty and active admins
- WhatsApp this month: sent, delivered, read, failed, delivery rate
- Messages by type (fee reminder, test result, absence alert)
- Scheduled batches waiting
- **Estimated WhatsApp cost** (messages × rate per message, in ₹)
- Activity this month: attendance marked, tests created, fee payments recorded, last activity date

At the top there are platform totals (all centers combined). You can also:
- pick a month
- sort by any column (for example "most messages" or "highest cost")
- search centers
- export to Excel

Tapping a center opens a detail panel with a daily message chart, the top failure reasons, and that center's scheduled batches.

### About "received" and cost
- Tutly only sends messages. It does not receive parents' replies, so "received" means **delivered to the parent's phone** and **read**. Collecting parents' replies would be a separate feature.
- Meta charges per approved template message. Super admin sets the **rate per message (₹)** once in a setting. The default is about ₹0.115 for utility messages in India; please confirm it against your Meta bill. Cost is an **estimate**, not Meta's invoice.
- Tutly's own cloud costs aren't recorded per center, so they can't be split by center. The activity counts show which centers use the platform most.

## Fixes to what was just built

1. **Overview numbers were capped.** The center WhatsApp page loads only the latest 200 messages, so a center that sends more sees the wrong monthly totals. Totals will be counted in the database instead, so they are always complete.
2. **Big scheduled batches could stall.** A single daily run can time out on large batches and leave them stuck as "processing". Batches will be sent in safe chunks. When unfinished work remains, the run starts itself again, with no extra timer. Batches stuck for over 30 minutes are recovered automatically. Every student is sent to at most once.
3. **Faster delivery updates.** Meta's status updates will be handled in one batch instead of one at a time.
4. **Lighter pages.** The history list loads 50 messages at a time with "Load more". It refreshes only while the page is visible, not every 15 seconds in the background.
5. **Clearer errors.** A batch shows a clear reason if the WhatsApp template isn't approved or the center has WhatsApp turned off.

## Technical details

- New SECURITY DEFINER RPC `get_platform_usage(_month date)` (super_admin only, raises otherwise) that returns per-tuition aggregates from `whatsapp_logs`, `whatsapp_scheduled_dispatches`, `students`, `faculty`, `student_attendance`, `weekly_tests`, `fee_payments`, `user_roles`. It is grouped once per table (no N+1). EXECUTE is revoked from public/anon.
- New RPC `get_whatsapp_stats(_tuition_id, _from, _to)` (center admin for own tuition, or super admin) returns counts by delivery status, template and day. The center Overview tab and the super-admin detail panel both use it.
- New `platform_settings` table (key/value, super_admin read/write) holding `whatsapp_rate_inr`. GRANTs and RLS are included.
- Indexes: `whatsapp_logs (tuition_id, template_name, created_at)` and `student_attendance (date)` if missing (checked first).
- `dispatch-scheduled-whatsapp`:
  - each run sends up to roughly 400 recipients, then moves on to the next chunk
  - saves `progress_offset`, sent and failed counts on the row after each chunk
  - when work remains, calls itself again in the background via `EdgeRuntime.waitUntil`
  - resets stale `processing` rows (older than 30 min) back to `pending` and resumes from the saved offset
  - the daily 9:00 AM IST timer stays unchanged
- New columns on the schedules table: `progress_offset int default 0` and `claimed_at timestamptz`.
- `whatsapp-webhook`: one `in('message_id', ids)` select, then grouped updates. Forward-only and failed-wins rules stay the same.
- Frontend:
  - new `src/components/super-admin/PlatformUsage.tsx` (table and cards on mobile, month picker, sort, search, Excel export via the existing xlsx usage) plus `CenterUsageDialog.tsx`
  - shown on `SuperAdmin.tsx` below the stats
  - `useWhatsAppLogs` switches to paged `useInfiniteQuery` with `refetchIntervalInBackground: false`
  - Overview uses the stats RPC
- Update `AGENTS.md` with the analytics RPC and chunked-dispatch rules.
