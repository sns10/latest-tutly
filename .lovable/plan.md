

# Fix: Add Student Failures & Mobile DOB Input

## Root Causes Found

### Bug 1: Empty string `divisionId` sent as UUID → DB error
In `AddStudentDialog.tsx` line 74, when no division is selected, `divisionId` is `""` (empty string). The check `divisionId === 'none'` doesn't catch empty strings, so `""` gets passed through to the mutation as `division_id`, which fails PostgreSQL's UUID type validation. This is the primary "add student failing on some devices" issue — it happens whenever the user doesn't pick a division.

### Bug 2: Missing fields in mutation — `fatherPhone`, `motherPhone`, `schoolName` dropped
`useAddStudentMutation` (lines 111-124) doesn't accept `fatherPhone`, `motherPhone`, or `schoolName`. The wrapper in `Students.tsx` (lines 104-118) maps `fatherPhone` → `parentPhone` but completely drops `motherPhone` and `schoolName`. So these fields are silently lost on every student add.

### Bug 3: DOB `type="date"` not typeable on mobile
On many mobile browsers (especially older Android WebViews), `<input type="date">` only shows a date picker and doesn't allow manual keyboard entry. Users need the ability to type a date directly.

## Changes

### File: `src/hooks/queries/useStudentsQuery.ts`
- Add `fatherPhone`, `motherPhone`, and `schoolName` to the `useAddStudentMutation` input type
- Map them to `father_phone`, `mother_phone`, `school_name` in the insert object

### File: `src/pages/Students.tsx`
- In the `addStudent` wrapper, pass `fatherPhone`, `motherPhone`, and `schoolName` through to the mutation instead of dropping them

### File: `src/components/AddStudentDialog.tsx`
- Fix `divisionId` empty string: change condition to `divisionId && divisionId !== 'none' ? divisionId : undefined`
- Replace DOB `<Input type="date">` with a dual-mode input: `type="text"` with `placeholder="YYYY-MM-DD"` and an `onFocus` handler that switches to `type="date"` on supported devices, plus a `pattern` attribute for validation. This allows typing on mobile while still showing the native picker when available.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/queries/useStudentsQuery.ts` | Add missing fields to mutation type + insert |
| `src/pages/Students.tsx` | Pass all fields through to mutation |
| `src/components/AddStudentDialog.tsx` | Fix empty divisionId bug + make DOB typeable |

