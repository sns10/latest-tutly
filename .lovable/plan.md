

# Fix: iPhone Login Shows "No Role Assigned" + Add Student Failures

## Root Causes Found

### Issue 1: `useUserRole` silently swallows errors → caches `null` for 30 minutes

The DB confirms `logos@gmail.com` **has** a `tuition_admin` role. The problem is in `useUserRole.ts` (lines 23-25): when the Supabase query fails (network timeout, Safari connection drop), the hook does `console.error` then `return null`. React Query treats this as a **successful** response and caches `null` for `staleTime: 30 minutes`. The user is stuck on "No Role Assigned" until the cache expires — no retry happens.

**Fix**: Throw the error instead of returning null. React Query will then retry automatically (3 retries by default with exponential backoff). Same fix needed in `useUserTuition.ts` which has the identical pattern.

### Issue 2: `useUserTuition` has the same silent-failure pattern

If `tuitionId` resolves to `null` due to a network error, the add-student mutation throws `"No tuition ID"` immediately — which is the "failed to add student" the user sees. This is a cascading failure from the same error-swallowing pattern.

### Issue 3: DOB field on iPhone — `onFocus` switching to `type="date"` is fragile

On iOS Safari, switching `type` from `text` to `date` on focus can cause the input to lose focus immediately (Safari re-renders the input when type changes). This creates a frustrating UX loop. Better approach: use a dedicated text input with auto-formatting, and provide a separate date picker button.

## Changes

### File: `src/hooks/useUserRole.ts`
- Change `return null` on error to `throw error` — React Query will retry automatically
- Add `retry: 3` explicitly for clarity

### File: `src/hooks/useUserTuition.ts`
- Same fix: throw error instead of returning null
- Add `retry: 3`

### File: `src/components/AddStudentDialog.tsx`
- Remove the fragile `onFocus`/`onBlur` type-switching for DOB
- Use a simple `type="text"` with `inputMode="text"` and `placeholder="YYYY-MM-DD"`
- Add basic date validation before submit (reject obviously invalid dates)
- This ensures iPhone users can type the date without the input fighting them

### File: `src/hooks/queries/useStudentsQuery.ts`
- Add `dateOfBirth` validation: if the value doesn't match `YYYY-MM-DD` pattern, send `null` instead of an invalid string to PostgreSQL

## Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| "No Role Assigned" on iPhone | Query error cached as null for 30 min | Throw error → React Query retries |
| "Failed to add student" | `tuitionId` is null from same error pattern | Same throw-on-error fix |
| DOB input broken on iPhone | `onFocus` type switch causes focus loss | Remove type switching, use plain text input |

## Risk
- Throwing errors instead of returning null is standard React Query practice
- React Query's built-in retry (3 attempts, exponential backoff) handles transient network failures
- No component API changes — hooks return the same shape

