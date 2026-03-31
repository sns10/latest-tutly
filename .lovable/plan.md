

# Academic Year Reset — Fresh Start Feature

## What We're Building
A "New Academic Year" reset feature that lets tuition admins wipe all transactional data (attendance, tests, marks, fees, XP, etc.) while optionally keeping structural data (students, subjects, faculty, divisions, rooms, timetable). This ensures a clean slate for the new academic year.

## How It Works

1. **Auto-backup before reset** — The system creates a full backup automatically before wiping anything, so data is never lost.
2. **Two reset modes**:
   - **Full Reset**: Deletes everything except the tuition record itself, subjects, faculty, divisions, and rooms. Students are kept but their transactional data (attendance, fees, tests, XP, badges) is wiped.
   - **Complete Fresh Start**: Deletes ALL data including students — truly starting from zero.
3. **Confirmation with typed input** — Admin must type "RESET" to confirm (prevents accidental resets).

## Data Deletion Order (respecting dependencies)

```text
Delete first (child tables):
  → fee_payments
  → student_test_results
  → term_exam_results
  → student_attendance
  → student_xp, student_badges, student_rewards
  → student_challenges
  → student_fees

Then parent tables:
  → weekly_tests
  → term_exam_subjects → term_exams
  → homework
  → announcements
  → challenges
  → timetable (optional — keep structure mode)

If "Complete Fresh Start":
  → students (also resets total_xp)
```

## Implementation Steps

### Step 1: Add `reset` action to `backup-tuition-data` edge function
- New action `reset` with a `resetMode` parameter (`keep_structure` or `full_reset`)
- Auto-creates a backup first
- Deletes data in correct dependency order using service role (bypasses RLS)
- Returns counts of deleted records per table

### Step 2: Add Reset UI to `BackupDashboard.tsx`
- New "New Academic Year" button with a warning card
- Two-option selector: "Keep Students & Structure" vs "Complete Fresh Start"
- Confirmation dialog requiring typed "RESET" input
- Progress display showing which tables are being cleared
- Summary of deleted records after completion

### Step 3: Fix existing build error in `CreateTestDialog.tsx`
- Fix the `maxMarks` type mismatch (zod schema returns `unknown`, needs explicit `number` coercion)

## Files Modified
- `supabase/functions/backup-tuition-data/index.ts` — add `reset` action
- `src/components/BackupDashboard.tsx` — add reset UI section
- `src/components/CreateTestDialog.tsx` — fix type error

## What Gets Preserved (Keep Structure mode)
| Kept | Deleted |
|------|---------|
| Students (names, contact, class) | Attendance records |
| Subjects | Test results & marks |
| Faculty & assignments | Fees & payments |
| Divisions | XP, badges, rewards |
| Rooms | Homework |
| Class fee config | Announcements |
| | Challenges & completions |
| | Term exams & results |
| | Timetable schedules |

## Safety Measures
- Mandatory backup created before any deletion
- Typed confirmation ("RESET") required
- Only tuition_admin or super_admin can trigger
- Rate limited (existing rate limiter)
- Detailed deletion log returned to UI

