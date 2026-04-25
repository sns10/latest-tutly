# Scalability Audit: Tutly — Production Readiness for Growing Data

## Honest verdict

**Today: Production-ready for current load.** Largest tuition has ~1,200 students and ~77K attendance rows. The app handles that fine.

**12–24 months out: Will degrade in 3 specific places** unless we change the loading strategy. The architecture is sound (multi-tenant, RLS, batched mutations, paginated reads, proper indexes), but several queries fetch **the entire history of a tuition into the browser on every dashboard load**. That works at 1,200 students and breaks at 5,000+.

This plan fixes only the parts that genuinely won't scale. Nothing else.

## What's already industry-grade ✅

These are real strengths we keep:

- **Multi-tenant isolation**: Every table has `tuition_id` + RLS policies enforcing it. Verified across 25+ tables.
- **Database indexes**: Critical hot paths are indexed — `student_attendance(student_id, date)`, `student_fees(student_id, status)`, `fee_payments(fee_id)`, `students(tuition_id)`, `timetable(class, day, dates)`.
- **Pagination loops** in 6 hooks already (`useFeesQuery`, `useAttendanceQuery`, `useTestsQuery`, `useStudentData`, `useTermExamData`) — bypasses Supabase's silent 1,000-row cap.
- **Batched mutations** for marks entry and fee generation (chunks of 300).
- **Atomic fee payment** via `record_fee_payment` SQL function (no race conditions).
- **Optimistic updates** for attendance marking.
- **React Query caching** with 5–10 min stale time → drastically reduces DB hits.
- **Code-splitting + lazy loading** on every route.
- **Virtual scrolling** for large student lists (`@tanstack/react-virtual`).
- **Backups** via `tuition_backups` + edge function.
- **Edge functions** with JWT verification.

## What will break under growth ⚠️

### Problem 1: `useFeesQuery` and `useAttendanceQuery` load the whole tuition's history into the browser

`useFeesQuery` paginates correctly **but has no upper bound** — it fetches every fee row ever created for the tuition (currently 2,500 rows fine; at 5,000 students × 24 months = 120,000 rows it will OOM mobile devices). Same for `useTestsQuery` and `useStudentData`.

`useAttendanceQuery` defaults to "last 30 days" which is good, BUT has a `MAX_RECORDS = 10000` hard cap that silently truncates data for large tuitions (a tuition with 1,500 students × 30 days × 5 subjects = 225K rows → only the most recent 10K returned).

### Problem 2: Dashboard loading gate fetches everything before showing UI

`Index.tsx` waits for students + fees + attendance + tests + announcements + challenges before rendering. At scale this becomes 500ms → 8 s on 4G mobile.

### Problem 3: No server-side aggregation for dashboard counters

Counters like "Total fees collected this month", "Attendance %", "Pending fees" are computed client-side by summing the entire dataset. This is the same root cause as Problem 1 — we ship raw rows when we only need aggregates.

### Problem 4: No DB-side scheduled job to mark fees overdue

Currently we derive `overdue` status client-side. That works but means every device repeats the same computation, and the `status` column in DB is permanently stale for reporting/exports.

### Problem 5: Edge function PDF/report generation is single-shot

`generate-report` and `backup-tuition-data` build everything in one synchronous request. At 10,000+ students an edge function will hit its 150 s wall-clock limit.

## The fix plan (phased — only do what we need now)

### Phase 1 — Do now (the only must-haves before next 6 months)

**1.1. Time-window the heavy reads.** Change `useFeesQuery`, `useTestsQuery`, `useStudentData` to default to **current academic year** (configurable). Older data only loads when a user explicitly opens "Fee history" / "All tests" / "Year-over-year" view. Files: `src/hooks/queries/useFeesQuery.ts`, `useTestsQuery.ts`, `useStudentData.ts`.

**1.2. Remove the silent `MAX_RECORDS = 10000` cap** in `useAttendanceQuery`. Replace with the same time-window approach (default last 60 days; explicit "load older" trigger).

**1.3. Add server-side aggregate RPCs** for dashboard cards:
- `get_tuition_dashboard_stats(_tuition_id, _month)` returns `{ totalCollected, totalPending, overdueCount, presentToday, absentToday }` in a single round-trip instead of shipping 100K rows.
- Wire `DailySummaryCard` and `FeeDashboard` to call these RPCs first; only fetch raw rows when the user drills in.

**1.4. Nightly cron job to flip `unpaid → overdue`** in `student_fees` so DB status matches reality. Single SQL function + `pg_cron` schedule. Keeps reports accurate even when generated server-side.

**1.5. Composite index audit.** Add 2 missing indexes the linter doesn't flag but matter at scale:
- `student_fees(tuition_id, due_date)` — sort+filter on dashboard.
- `student_attendance(date, student_id)` — date-range scans.

### Phase 2 — Do when largest tuition crosses 3,000 students (estimated 6–12 months out)

**2.1. Chunk reports/backups.** Refactor `generate-report` and `backup-tuition-data` edge functions to stream/chunk per-class instead of one giant query. Use `Response.body` ReadableStream for the PDF case.

**2.2. Materialized monthly summaries.** Create `monthly_attendance_summary` and `monthly_fee_summary` tables refreshed nightly. Reports query these instead of recomputing across years.

**2.3. Cursor-based pagination for student lists.** Replace `range()` with keyset pagination on `students` table for tuitions over 5,000 students.

### Phase 3 — Do when platform hits 50+ tuitions or any single tuition crosses 10,000 students

**3.1. Read replicas / Supabase compute upgrade.** Move analytics-heavy reads to a read replica, push the primary to a larger Cloud instance.

**3.2. Background job queue** for backups, bulk imports, mass WhatsApp generation (currently runs in-request).

**3.3. CDN for tuition logos and material files.**

## What we don't need to change

- Schema design — solid.
- RLS policies — correct multi-tenant pattern.
- Batched insert/upsert pattern — already in use.
- React Query setup — already optimal stale times.
- Auth + role system — separate `user_roles` table, security definer functions, audit logs. Industry standard.
- Mobile bootstrap (auth token cleanup, service worker, defensive try/catch) — already hardened.

## Files touched in Phase 1

| File | Change |
|------|--------|
| `src/hooks/queries/useFeesQuery.ts` | Default to current academic year; expose `loadHistory` flag |
| `src/hooks/queries/useAttendanceQuery.ts` | Remove `MAX_RECORDS` cap; default to 60-day window |
| `src/hooks/queries/useTestsQuery.ts` | Same time-window pattern |
| `src/hooks/useStudentData.ts` | Same time-window pattern (student portal) |
| `src/components/DailySummaryCard.tsx` | Use new RPC instead of summing client-side |
| `src/components/fees/FeeDashboard.tsx` | Use new aggregate RPC for headline numbers |
| New SQL migration | `get_tuition_dashboard_stats` RPC + `mark_overdue_fees` function + pg_cron schedule + 2 composite indexes |

## Honest answer to "is this industry-grade?"

**Yes for 1–50 tuitions of 500–2,000 students each.** That's already a real SaaS scale. The patterns (RLS, batched writes, paginated reads, atomic SQL functions, RBAC, audit logs, backups, lazy routes, virtual lists) are all what you'd find at a Series-A B2B SaaS.

**Phase 1 of this plan extends that headroom to ~5,000 students per tuition** with no architectural rewrite — just disciplined query scoping and a few RPCs. That's where you want to be before adding paying customers heavily.

**Phase 2 + 3 are the playbook for when you actually hit those limits** — not work to do speculatively today.

## Risk

Low. Phase 1 is additive (new RPC, new indexes, narrower default queries with opt-in "load history"). No data migrations, no breaking API changes, no UI rewrites. Each step is independently revertible.

## Recommendation

Approve **Phase 1 only**. Ship it before onboarding more tuitions. Revisit Phase 2 when telemetry shows a tuition crossing 2,500 students or any single dashboard load >3 s.
