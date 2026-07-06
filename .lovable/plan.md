## Problem

The `send-attendance-reminders` edge function is being invoked **every single minute** by a pg_cron job (43,200 invocations/month), but the function body is a **no-op** — push notifications were disabled and it just returns `{ message: "Push notifications disabled" }`. This is wasted cloud compute + function invocations for zero benefit.

The in-app attendance reminder dialog is client-side and does NOT depend on this cron.

## Changes

1. **Unschedule the cron job** (via `supabase--insert` running a raw SQL call to `cron.unschedule('send-attendance-reminders')` — user-specific, so not a migration).
2. **Delete the edge function** `send-attendance-reminders` using `supabase--delete_edge_functions`.
3. Leave the nightly `mark-overdue-fees-nightly` cron alone — that one is useful and runs only once a day.

## Not touched

- No frontend changes. `AttendanceNotificationAlert` and in-app reminders keep working.
- No other cron jobs affected.

## Expected impact

- Eliminates ~43k function invocations/month.
- Small but real reduction in cloud function credits and background load on the DB.
