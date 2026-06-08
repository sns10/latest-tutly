# Fix: "Failed to generate fees" for any month

## Cause
`useAddFeesBatchMutation` uses `.upsert(..., { onConflict: 'student_id,fee_type' })`, but the matching unique index in the DB is **partial** (`WHERE fee_type LIKE 'Monthly Fee - %'`). Postgres won't accept ON CONFLICT against a partial index, so every batch generate request errors out. That's why clicking "Generate Fees" for April 2026 (or any month) shows the toast and creates 0 records.

## Fix (single file change)

**`src/hooks/queries/useFeesMutations.ts` — `useAddFeesBatchMutation`**

Replace the `.upsert(...)` call with a plain `.insert(...)`. The client (`FeesList.generateMonthlyFees`) already filters out students who already have a fee for the target month, so duplicates won't normally happen. The partial unique index stays in place as a safety net.

To stay resilient if the cache is stale and a duplicate slips through:
1. Try `.insert(feeRecords).select('id')`.
2. If the error code is `23505` (unique_violation), fall back to inserting rows one-by-one and skip rows that violate the unique index; return the count of successfully inserted rows.
3. Any other error → throw as today.

Keep the existing success/info toasts based on inserted count (`> 0` → "Generated fees for N students", else "All students already have fees…").

## Why not change the index instead
Making the index non-partial would block legitimate use cases (e.g. recording two custom fees of the same type for a student across years). The partial index is correct; only the client call is wrong.

## Verification
- Click **Generate Fees** for April 2026 → records appear, toast shows correct count.
- Click again immediately → toast "All students already have fees for the selected month", no duplicates created.
- Other mutations (record payment, void, add custom fee) untouched.

## Files touched
- `src/hooks/queries/useFeesMutations.ts` (only `useAddFeesBatchMutation`)

No DB migration, no UI changes.
