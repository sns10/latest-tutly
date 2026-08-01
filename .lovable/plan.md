## Verdict on the four reported issues

Checked the current code in `src/components/AttendanceTracker.tsx`:

| # | Issue | Status |
|---|-------|--------|
| 1 | Partial filter mismatch in exact lookup | **Still present** (lines 164-176) — worth fixing |
| 2 | Subject change keeps stale faculty | **Still present** (lines 281-284, 691-707) — worth fixing |
| 3 | Copy-from-previous uses search-filtered students | **Already fixed** — now uses `targetStudents` (line 446) |
| 4 | Bulk toast said "All visible students" | **Already fixed** — now "All students are already marked X" (line 418) |

Two of the four remain. Both are real and can make saved attendance look missing or land on the wrong session.

## 1. Partial filter mismatch (subject selected, faculty = All)

Today the exact-session lookup requires `faculty_id IS NULL` whenever no faculty is chosen. A row saved for that subject *with* a faculty attached is invisible: the student shows as unmarked, and a bulk action writes a second row for the same subject with a null faculty.

Change: treat an unselected dimension as "any", not "must be null".

- Subject chosen, faculty = All -> match any row for that subject on that date (prefer a faculty-null row when one exists, otherwise the first faculty row).
- Faculty chosen, subject = All -> mirror behaviour.
- Both All -> unchanged (general row only: subject and faculty both null).
- Both chosen -> unchanged strict match.

Saving stays consistent: when a mark is written and one dimension is unselected, reuse the subject/faculty of the row that was matched, so the update lands on the existing row instead of creating a duplicate session row. When nothing matched, keep the current behaviour (null for the unselected dimension).

This keeps stats, status filters, and bulk decisions aligned with the rows that actually exist.

## 2. Stale faculty after subject change

`availableFaculty` narrows to the faculty who teach the selected subject, but `selectedFaculty` is never reset when the subject changes. The dropdown then shows a faculty that isn't in its own list, and marks save against a subject/faculty pair that doesn't exist in the timetable.

Change: when the subject changes, clear `selectedFaculty` if that faculty does not teach the new subject. Choosing "All subjects" leaves the faculty selection alone, since every faculty is valid again.

## Technical notes

Single file: `src/components/AttendanceTracker.tsx`.

- Rework `getExactAttendanceForStudent` to score candidates — strict pair first, then a relaxed match on only the dimension the user left as "All".
- Have `handleMarkAttendance`, `handleBulkAttendance` and `handleCopyFromPreviousClass` derive the `subjectId` / `facultyId` they send from the matched row when the corresponding filter is "All", falling back to `undefined`.
- Add the faculty-reset in the subject `onValueChange` handler, mirrored in a small effect so the smart-detect path stays valid too.
- No database, RPC, or hook changes; `bulk_mark_attendance` already upserts on the same key.