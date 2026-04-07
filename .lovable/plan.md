

# Update PROJECT_KNOWLEDGE.md & Fix Remaining Data Risks

## Analysis Summary

The refactor is complete and clean — `useSupabaseData` is no longer imported by any component. However, there are documentation gaps and a few remaining data consistency risks.

### Data Risks Found

1. **`usePaymentsQuery` has `.limit(2000)`** — Large tuitions with many payments will silently lose older records. Should paginate like fees do.
2. **`useTestResultsQuery` has a 5000 cap** — Comment says "safety cap at 5000 for dashboard stability" but this silently drops results for large tuitions. Same issue the attendance report had.
3. **`useWeeklyTestsQuery` has `.limit(100)`** — Tuitions with more than 100 tests lose older ones from queries.
4. **`term_exam_results` has `.limit(5000)`** in `useTermExamData.ts` — Same pattern, silently drops data.
5. **Bulk attendance upsert uses `onConflict: 'student_id,date,subject_id,faculty_id'`** — This composite unique constraint may not exist in the database, which would cause upserts to fail or create duplicates instead of updating.

### Documentation Gaps

The PROJECT_KNOWLEDGE.md is outdated:
- Section 6 still references `useSupabaseData` as "Main data orchestrator" 
- No mention of the domain hook architecture (`src/hooks/queries/`)
- Missing the new mutation hooks (`useStudentMutations`, `useXpMutations`, etc.)
- File structure section doesn't reflect the refactored architecture
- Recent changes log missing the April 2026 refactor entries

## Changes

### File: `PROJECT_KNOWLEDGE.md`
- **Section 6 (Key Hooks)**: Replace `useSupabaseData` reference with the new domain hook architecture. Document all query and mutation hook files.
- **Section 12 (File Structure)**: Update `hooks/queries/` directory listing with all new files.
- **Section 11 (Recent Changes)**: Add April 2026 entries for the god-hook refactor, on-demand report attendance, and service worker caching.
- **Section 13 (Rules for AI)**: Add rules about importing domain hooks directly, never using `useSupabaseData`, and paginating all queries.

### File: `src/hooks/queries/useFeesQuery.ts`
- Remove `.limit(2000)` from `usePaymentsQuery` and add pagination loop (same pattern used in `useFeesQuery`).

### File: `src/hooks/queries/useTestsQuery.ts`
- Remove the 5000 safety cap from `useTestResultsQuery` — it already paginates, just let it finish.
- Remove `.limit(100)` from `useWeeklyTestsQuery` — paginate instead.

### File: `src/hooks/useTermExamData.ts`
- Remove `.limit(5000)` from term exam results query and add pagination.

### File: `src/hooks/useSupabaseData.ts`
- Add a deprecation JSDoc warning that this file is unused and should be deleted in a future cleanup.

## Summary Table

| File | Issue | Fix |
|------|-------|-----|
| `PROJECT_KNOWLEDGE.md` | Outdated after refactor | Full update with new architecture |
| `useFeesQuery.ts` | Payments capped at 2000 | Paginate |
| `useTestsQuery.ts` | Tests capped at 100, results at 5000 | Paginate both |
| `useTermExamData.ts` | Results capped at 5000 | Paginate |
| `useSupabaseData.ts` | Unused but still exists | Mark for deletion |

