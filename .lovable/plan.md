

# Fix: Payment Race Condition with Atomic Database Function

## Problem Confirmed
`useRecordPaymentMutation` in `useFeesQuery.ts` (lines 277-340) performs 4 sequential Supabase calls:
1. Insert payment record
2. Query all payments to sum total
3. Query fee amount
4. Update fee status

Between steps 1 and 2, a concurrent payment could insert, causing both to read incomplete totals and set incorrect status (e.g. both see "partial" when combined they equal "paid").

## Fix

### Step 1: Database migration — Create `record_fee_payment` function
Create an atomic PostgreSQL function that wraps all 4 operations in a single transaction. The function:
- Inserts the payment
- Sums total paid atomically
- Determines status (`paid` vs `partial`)
- Updates `student_fees` status and `paid_date`
- Returns `{totalPaid, feeAmount, newStatus}` as JSONB

Uses `SECURITY DEFINER` so it executes with owner privileges, bypassing RLS (the caller is already authenticated and authorized via the mutation context).

### Step 2: Update `useRecordPaymentMutation` in `useFeesQuery.ts`
Replace the 4 sequential Supabase calls with a single `supabase.rpc('record_fee_payment', {...})` call. The return shape stays identical — no changes needed in `Fees.tsx` or any component.

## Files Modified

| File | Change |
|------|--------|
| New migration | `CREATE FUNCTION record_fee_payment(...)` |
| `src/hooks/queries/useFeesQuery.ts` | Replace lines 288-335 with single `supabase.rpc()` call |

## Risk
- Zero frontend changes beyond the mutation function body
- Return value shape unchanged — `{ totalPaid, feeAmount, newStatus }`
- Existing `onSuccess` invalidation logic stays the same

