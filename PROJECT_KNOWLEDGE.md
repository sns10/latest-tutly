# Tutly by UpSkillr — Project Knowledge Base

> **Last updated**: 2026-04-07
> This file serves as the single source of truth for AI context. Update it whenever significant changes are made.

---

## 1. Architecture Overview

### Platform Type
Multi-tenant SaaS for tuition center management built with **React 18 + Vite + TypeScript + Tailwind CSS + Lovable Cloud (Supabase)**.

### Role Hierarchy
```
Super Admin → Tuition Admin → Student / Parent (portal)
```

### Data Isolation
Every data table has a `tuition_id` foreign key + RLS policies ensuring complete tenant isolation.

### Authentication
- Supabase Auth with `user_roles` table using `app_role` enum: `super_admin`, `tuition_admin`, `student`, `parent`
- Portal users: shared email per tuition OR individual student accounts
- Login rate limiting via `useLoginRateLimit` hook

---

## 2. Tech Stack & Key Dependencies

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TypeScript 5 |
| Styling | Tailwind CSS 3, shadcn/ui (Radix primitives) |
| State | @tanstack/react-query v5 (cached, optimistic) |
| Routing | react-router-dom v6 (lazy-loaded pages) |
| Backend | Lovable Cloud (Supabase) — DB, Auth, Edge Functions, Storage |
| Charts | Recharts |
| PDF/Excel | jsPDF, xlsx, html2canvas |
| Forms | react-hook-form + zod validation |
| PWA | vite-plugin-pwa + service worker |

---

## 3. Routing & Navigation

### App.tsx Structure
```
QueryClientProvider → BrowserRouter → AuthProvider → SidebarProvider
  ├── AppSidebar (desktop, feature-gated menu items)
  ├── BottomNav (mobile: Home, Board, Schedule, Reports)
  └── Routes:
      ├── /auth → AuthPage (public)
      ├── /privacy, /terms → Legal pages (public)
      ├── /register/:tuitionSlug → Student self-registration (public)
      ├── /super-admin → SuperAdmin (super_admin only)
      ├── /student → Student portal (student/parent/portal users)
      └── /* → Index.tsx (tuition_admin) with nested sub-routes:
          ├── / → Dashboard
          ├── /tests, /students, /classes
          ├── /attendance, /fees, /timetable, /materials
          ├── /leaderboard, /reports
          └── All feature-gated via FeatureGate component
```

### ProtectedRoute
- Role-based access + portal-user detection + tuition status enforcement
- Inactive/expired/suspended tuitions → blocked with `TuitionInactiveScreen`
- Uses React Query caching for role + portal checks (no redundant API calls)

---

## 4. Feature Tier System

Features are toggled per tuition by Super Admin. Gated via `FeatureGate` component and `isFeatureEnabled()` hook.

| Tier | Features |
|------|----------|
| **Core** | Attendance, Fees, Student Portal |
| **Standard** | Timetable, Materials, Homework, Announcements, Leaderboard, Gamification (XP) |
| **Premium** | Reports, Term Exams, Bulk Import, WhatsApp Alerts, Room Scheduling, Challenges |

Defined in: `src/hooks/useTuitionFeatures.ts` → `ALL_FEATURES` array

---

## 5. Database Schema (20+ tables)

### Core Tables
| Table | Purpose |
|-------|---------|
| `tuitions` | Tenant config: name, logo, features, subscription, portal_email, slug |
| `profiles` | User profiles with tuition_id mapping |
| `user_roles` | Role assignments (app_role enum) |
| `students` | Student records with class, division, XP, father_phone, mother_phone, user_id link |
| `divisions` | Class divisions (e.g., 10th-A, 10th-B) |
| `subjects` | Subjects per class per tuition |
| `faculty` | Faculty members |
| `faculty_subjects` | Faculty-subject assignments |

### Feature Tables
| Table | Purpose |
|-------|---------|
| `student_attendance` | Daily attendance with subject/faculty tracking |
| `student_fees` | Fee records with status tracking |
| `fee_payments` | Individual payment transactions |
| `class_fees` | Default fee amounts per class |
| `weekly_tests` | Test definitions |
| `student_test_results` | Test marks |
| `term_exams` | Multi-subject term exams |
| `term_exam_subjects` | Subjects within term exams |
| `term_exam_results` | Term exam marks |
| `timetable` | Regular + special class schedules |
| `rooms` | Room management |
| `homework` | Homework assignments |
| `academic_materials` | Study materials/files |
| `announcements` | Announcements per class |
| `challenges` | Student challenges |
| `student_challenges` | Challenge completions |
| `student_xp` | XP per category |
| `student_badges` | Earned badges |
| `student_rewards` | Purchased rewards |
| `push_subscriptions` | Push notification subscriptions |
| `tuition_backups` | Data backup snapshots |
| `audit_logs` | Admin action logs |

---

## 6. Key Hooks & Data Flow

### Domain Hook Architecture (Refactored April 2026)

All data fetching and mutations use **domain-specific hooks** in `src/hooks/queries/`. The old monolithic `useSupabaseData` hook is deprecated and unused.

| Hook File | Queries | Mutations |
|-----------|---------|-----------|
| `useCoreDataQuery.ts` | divisions, subjects, faculty, rooms, timetable, challenges, announcements, studentChallenges | — |
| `useStudentsQuery.ts` | students | addStudent (with auto-division + roll number), removeStudent |
| `useStudentMutations.ts` | — | updateStudent, assignEmail, assignTeam, updateDivision |
| `useAttendanceQuery.ts` | attendance, todayAttendance, historicalAttendance, reportAttendance, studentAttendance | markAttendance, bulkMarkAttendance |
| `useFeesQuery.ts` | fees (paginated), classFees, todayPayments, payments (paginated) | addFee, updateFeeStatus, deleteFee, recordPayment, updateClassFee |
| `useFeesMutations.ts` | — | addFeesBatch |
| `useTestsQuery.ts` | weeklyTests (paginated), testResults (paginated) | addWeeklyTest, deleteWeeklyTest, addTestResult, addTestResultsBatch |
| `useXpMutations.ts` | — | addXp, reduceXp, awardXp, buyReward, useReward |
| `useChallengeMutations.ts` | — | addChallenge, completeChallenge |
| `useAnnouncementMutations.ts` | — | addAnnouncement |
| `useFacultyMutations.ts` | — | addFaculty, updateFaculty, deleteFaculty |
| `useSubjectMutations.ts` | — | addSubject, updateSubject, deleteSubject |
| `useTimetableMutations.ts` | — | addTimetableEntry, updateTimetableEntry, deleteTimetableEntry |
| `useDivisionMutations.ts` | — | addDivision, updateDivision, deleteDivision |
| `useRoomMutations.ts` | — | addRoom, updateRoom, deleteRoom |

### Tuition Data Hooks
| Hook | Purpose | Cache |
|------|---------|-------|
| `useTuitionData` | Single query for all tuition fields | 10 min stale |
| `useTuitionInfo` | Derived from useTuitionData | shared cache |
| `useTuitionFeatures` | Derived from useTuitionData | shared cache |
| `useTuitionStatus` | Derived from useTuitionData | shared cache |
| `useUserRole` | React Query cached role fetch | 30 min stale |
| `useUserTuition` | Profile → tuition_id mapping | 30 min stale |

### Term Exam Data
| Hook | Purpose |
|------|---------|
| `useTermExamData` | All term exam queries + mutations (paginated results) |

### Query Architecture
- Global `staleTime`: 5 minutes (set in App.tsx QueryClient)
- Global `gcTime`: 15 minutes
- Role/tuition data: 30 min stale (rarely changes)
- Feature flags: derived from shared tuition query (zero extra calls)
- **All large datasets use pagination loops** (no arbitrary `.limit()` caps)

### Performance Patterns
- Each page imports only its required domain hooks (no global re-renders)
- Chunked `.in()` filters for arrays > 200 items
- Paginated queries for fees, test results, payments, term exam results
- Explicit `tuition_id` filters on all queries
- Joined queries to reduce API calls (e.g., fees + payments)
- Fee status calculated from DB truth via `useRecordPaymentMutation`
- Optimistic mutations for attendance marking
- Virtualized lists for large student lists (`@tanstack/react-virtual`)

---

## 7. Edge Functions

| Function | Purpose |
|----------|---------|
| `backup-tuition-data` | Full data export for a tuition |
| `check-subscription-reminders` | Subscription expiry alerts |
| `create-student-user` | Create individual student auth accounts |
| `generate-report` | PDF report generation |
| `register-student` | Public student self-registration |
| `send-attendance-reminders` | Attendance notification dispatch |
| `setup-tuition-admin` | Admin profile + role setup |

---

## 8. Module Details

### Super Admin
- CRUD tuition centers with subscription management
- Feature toggle per tuition (15 features × 3 tiers)
- Admin assignment via `TuitionAdminManager`
- Platform-wide statistics + backup management

### Dashboard (Index.tsx)
- Tuition branding with logo
- Daily summary: today's classes, attendance snapshot, fee collection, upcoming tests
- Student alerts: 3+ consecutive absences, 20%+ test score drops (session-dismissible)
- Quick actions, recent tests, homework manager
- Full test manager with term exams integration
- Settings sheet with backup dashboard

### Student Management
- Add/edit/delete with auto roll-number assignment
- Auto-create default division "A"
- Bulk Excel import
- Student details dialog (tabs: overview, tests, attendance, fees)
- Individual portal account assignment
- Public registration via `/register/:tuitionSlug` with QR code

### Tests & Marks
- Weekly tests: CRUD with class/subject/date/max-marks
- Marks entry: individual or bulk Excel upload
- Term exams: multi-subject with student-wise entry
- Batch upserts chunked at 300 per request
- Draft saving for marks entry

### Attendance
- Mark by subject/faculty per day
- Smart Check: auto-detect current class from timetable
- Bulk mark with optimistic mutations
- WhatsApp absence notification
- Subject-wise breakdown, 30-day window

### Fees
- Dashboard with charts/statistics
- Fee structure: types, templates, late fees, discounts
- Partial/full payments, multiple methods
- Receipt generation, WhatsApp reminders
- Class-wise/monthly/defaulter reports with Excel export
- Payment tracking via `fee_payments` table

### Timetable & Scheduling
- Weekly regular + special class scheduling
- Room management with capacity tracking
- Room occupancy visualization
- Timeline view merging weekly + special events
- Division-based support

### Gamification
- XP system (blackout, futureMe, recallWar categories)
- Rewards store (Streak Freeze, Recall Shield, Double XP, Question Master)
- Badges, challenges, attendance streaks
- Student leaderboard

### Student Portal
- Shared access (single email per tuition) OR individual accounts
- Views: attendance calendar, test results, fees, leaderboard, homework, announcements
- Read-only access

### Reports
- Monthly attendance report
- Consolidated test report with ranks
- Student report card (printable)
- Term exam report (subject-wise)
- PDF (A4) + Excel export with institution branding

---

## 9. Security

- RLS policies on ALL tables (multi-tenant isolation)
- `has_role()` security definer function prevents recursive RLS
- `get_user_tuition_id()` security definer for tenant scoping
- Login rate limiting
- Input validation (`lib/validation.ts`)
- Audit logs (read-only for admins)
- Portal user detection via email matching

---

## 10. PWA & Reliability

- Service worker for offline capability
- Manifest for installability
- Chunk error retry (3 attempts + exponential backoff) for mobile
- Network status monitoring with toasts
- Error boundary with collapsible technical details
- Bootstrap script clears stale auth tokens on init

---

## 11. Recent Changes Log

### April 2026 — Data Integrity Fixes (Critical)
- **Fee status persistence fix**: Migrated payment state from local `useState` to React Query (`usePaymentsQuery`, `useRecordPaymentMutation`). Fee status now recalculated from database truth after each payment, preventing stale-state overwrites that caused fees to revert to "unpaid"
- **Bulk payment tracking**: `handleBulkMarkPaid` now creates actual `fee_payments` records for every fee marked as paid, ensuring consistency between status and financial records
- **Query limit removal**: Removed `.limit(500)` on fees and `.limit(2000)` on test results. Both now use pagination loops to fetch all records, preventing older data from disappearing
- **RecordPaymentDialog JSX fix**: Fixed nesting error causing notes validation/character counter to display incorrectly

### April 2026 — Father & Mother Phone Numbers
- **Database**: Added `father_phone` and `mother_phone` columns to `students` table. Existing `parent_phone` data auto-migrated to `father_phone`
- **Forms updated**: AddStudentDialog, StudentDetailsDialog, StudentRegistration — father phone required, mother phone optional
- **Bulk import**: Excel template updated with both phone columns
- **Edge function**: `register-student` updated to accept both phone fields
- **WhatsApp reminders**: Use `fatherPhone` with fallback to `motherPhone`

### April 2026 — Student Data Export
- **Export button** on Students page with dropdown: export current class filter or all students
- **Excel output** includes: Name, Class, Division, Roll No, DOB, Gender, Email, Phone, Father Phone, Mother Phone, Parent Name, Address
- Uses existing `xlsx` library

### April 2026 — Malayalam Fee Reminder Template
- **Language toggle** (English / മലയാളം) in WhatsApp fee reminder dialog
- Full Malayalam template with proper script for greeting, fee details, and closing
- Admin can edit message before sending regardless of language

### April 2026 — Academic Year Reset Feature
- **"New Academic Year"** reset in settings for tuition admins
- Wipes transactional data (attendance, tests, marks, fees, XP, badges, rewards, homework, announcements, challenges, term exams, timetable)
- Optionally keeps structural data (students, subjects, faculty, divisions, rooms, class fee config)
- Mandatory backup before deletion, typed confirmation ("RESET") required
- Only tuition_admin or super_admin can trigger

### March 2026 — Cloud Usage Optimization
- **Consolidated tuition queries**: 3 separate hooks → single `useTuitionData` hook → saved 2 API calls per page load
- **Converted useEffect hooks to React Query**: `useUserRole` (30min cache), `ProtectedRoute` portal check (30min cache)
- **Increased global staleTime**: 2min → 5min, gcTime: 10min → 15min
- **Updated all dependencies** to latest versions
- **Result**: ~50% reduction in API calls on dashboard load

---

## 12. File Structure (Key Files)

```
src/
├── App.tsx                          # Root with routing, QueryClient, providers
├── main.tsx                         # Entry point
├── bootstrap.ts                     # Auth token cleanup on init
├── types.ts                         # Shared TypeScript interfaces
├── components/
│   ├── AuthProvider.tsx              # Auth context
│   ├── ProtectedRoute.tsx           # Role-based route guard
│   ├── AppSidebar.tsx               # Desktop sidebar (feature-gated)
│   ├── BottomNav.tsx                # Mobile bottom nav
│   ├── FeatureGate.tsx              # Feature tier gate component
│   ├── ErrorBoundary.tsx            # Global error handling
│   ├── ui/                          # shadcn/ui components
│   ├── fees/                        # Fee management components
│   ├── attendance/                  # Attendance components
│   ├── scheduling/                  # Timetable/room components
│   ├── reports/                     # Report generation components
│   ├── student-portal/              # Portal-specific components
│   ├── super-admin/                 # Super admin components
│   ├── term-exams/                  # Term exam components
│   └── legal/                       # Privacy/Terms pages
├── hooks/
│   ├── useTuitionData.ts            # Consolidated tuition query (single source)
│   ├── useTuitionInfo.ts            # Derived from useTuitionData
│   ├── useTuitionFeatures.ts        # Derived from useTuitionData
│   ├── useTuitionStatus.ts          # Derived from useTuitionData
│   ├── useUserRole.ts               # Cached role fetch
│   ├── useUserTuition.ts            # Profile → tuition_id
│   ├── useSupabaseData.ts           # Main data orchestrator
│   └── queries/                     # Domain-specific React Query hooks
├── pages/
│   ├── Index.tsx                    # Admin dashboard with nested routes
│   ├── SuperAdmin.tsx               # Platform management
│   ├── Student.tsx                  # Student portal
│   └── [Feature pages]             # Lazy-loaded feature pages
├── integrations/supabase/
│   ├── client.ts                    # Auto-generated Supabase client
│   └── types.ts                     # Auto-generated DB types
└── supabase/
    ├── config.toml                  # Auto-generated config
    └── functions/                   # Edge functions
```

---

## 13. Important Rules for AI

1. **Never edit**: `client.ts`, `types.ts`, `config.toml`, `.env` — these are auto-generated
2. **RLS required** on all new tables (use `has_role()` and `get_user_tuition_id()`)
3. **Always include `tuition_id`** filters in queries for performance
4. **Use React Query** for all data fetching — no raw useEffect+useState for API calls
5. **Feature-gate** new features using `FeatureGate` component or `isFeatureEnabled()`
6. **Register new features** in `ALL_FEATURES` array in `useTuitionFeatures.ts`
7. **Chunk large operations** (300 per batch for upserts, 200 for `.in()` filters)
8. **Stay on React 18** — React 19 has breaking changes with current dependencies
9. **Keep `react-day-picker` at v8** — v9 requires shadcn calendar component rewrite
10. **Update this file** when making significant architectural changes
