
# Plan: Resume & Interview Prep PDF for Tutly by UpSkillr

I'll generate a single polished PDF (`/mnt/documents/Tutly_Interview_Prep.pdf`) you can attach alongside your resume. No code changes to the app.

## What the PDF will contain

1. **Project Overview** — what Tutly is, who uses it, the problem it solves (multi-tenant SaaS for tuition centers).
2. **Architecture** — 3-tier role hierarchy (Super Admin → Tuition Admin → Student/Parent), multi-tenant isolation via `tuition_id` + RLS, client-side React SPA + Supabase backend.
3. **Tech Stack** — React 18, Vite 5, TypeScript, Tailwind + shadcn/ui, TanStack Query v5, React Router v6, Supabase (Postgres + Auth + Edge Functions + Storage), Recharts, jsPDF/xlsx, PWA via vite-plugin-pwa.
4. **How it Works** — auth flow, role resolution via `user_roles` + `has_role()` SECURITY DEFINER, feature gating (Core/Standard/Premium tiers), domain-driven query hooks, optimistic mutations, paginated `.range()` loops.
5. **Scaling & Performance** — RLS-scoped tenant isolation, chunked upserts (300/batch), `.in()` chunking (200), academic-year-scoped queries, virtualized lists, React Query caching (5min stale / 15min gc), service-worker offline cache, lazy-loaded routes with chunk-retry.
6. **Maintenance & Reliability** — error boundary, network status monitoring, auth-token cleanup on bootstrap, audit logs, migration-based schema evolution, atomic `record_fee_payment` RPC to prevent race conditions.
7. **Feature Catalogue** — Attendance (Smart Check from timetable), Fees (partial payments, WhatsApp reminders, receipts), Weekly Tests + Term Exams (with Absent toggle, decimal marks), Timetable + Room Scheduling, Gamification (XP, badges, challenges, streaks), Reports (PDF/Excel), Student Portal (shared or per-student auth), Bulk Excel import, Public registration via QR/slug.
8. **Algorithms & Notable Logic** — attendance streak calculation, rank computation in consolidated reports, fee-status derivation from payments (not status flag), client-side overdue detection, alert heuristics (3+ consecutive absences, 20%+ score drop), roll-number auto-assignment, chunked pagination.
9. **Security** — RLS on every table, SECURITY DEFINER functions to avoid recursive RLS, role storage in separate `user_roles` table (prevents privilege escalation), login rate limiting, input validation, tuition-status enforcement.
10. **Interview Topics List** — areas an interviewer is likely to probe (RLS, multi-tenancy, React Query patterns, optimistic updates, PWA, edge functions, etc.).
11. **20+ Probable Interview Questions with Answers** — grouped by:
    - System design & architecture (multi-tenancy, RLS, scaling)
    - React & frontend (Query caching, lazy loading, error boundaries)
    - Backend & database (Postgres functions, triggers, migrations)
    - Security (role escalation prevention, RLS pitfalls)
    - Performance (pagination, virtualization, chunking)
    - Trade-offs and "why did you choose X?" questions
12. **How to Impress the Interviewer** — concrete talking points: lead with the business problem, quantify (number of tables, tenants, features), show trade-off awareness, mention production-grade concerns (race conditions, offline, PWA), have a 60-second demo path ready, prep one "thing I'd refactor next" answer.
13. **"Did you build it or vibe-code it?" guidance** — honest framing: say you **designed and built it using AI-assisted development (Lovable)** — describe your role as architect/PM/QA: deciding features, schema design, debugging, security review, prompting strategy. This is the modern, honest answer interviewers respect far more than either extreme. Includes a sample one-liner for your resume bullet.

## Technical approach

- Use ReportLab (Python) with Platypus for clean multi-page layout, table of contents, styled headings, Q&A boxes, and code-style callouts.
- A4, professional palette (navy + slate accents), Helvetica.
- After generation: convert to JPEG via `pdftoppm` and visually QA every page (overflow, clipping, contrast). Iterate until clean.
- Deliver via `<presentation-artifact>` for one-click download.

Estimated length: ~15–20 pages.
