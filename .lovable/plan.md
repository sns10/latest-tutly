

# Data Integrity Fix — Fees & Marks Disappearing

## Root Causes Found

### Bug 1: Fee status reverts due to stale payment data (CRITICAL)
In `Fees.tsx`, payments are stored in local `useState` (not React Query). When `handleRecordPayment` runs:
1. A payment is inserted into the database
2. `totalPaid` is calculated using the **stale local `payments` array** (which hasn't refetched yet)
3. If the stale array is missing previous payments, the code calculates wrong totals and sets status to `'partial'` instead of `'paid'`
4. Next time the page loads, it re-fetches and the fee appears as `partial` or `unpaid`

Additionally, `handleMarkAsPaid` in `FeesList.tsx` calls `onRecordPayment` but never directly calls `onUpdateFeeStatus('paid')` — it relies entirely on the stale-state calculation above.

### Bug 2: Bulk "Mark as Paid" skips payment records (CRITICAL)  
`handleBulkMarkPaid` in `FeesList.tsx` (line 259-269) only calls `onUpdateFeeStatus(feeId, 'paid')` without recording a payment entry. This means:
- Fee shows as "paid" initially
- But there's no `fee_payments` record to back it up
- When the dashboard recalculates totals from `fee_payments`, the numbers don't match
- Some views may show it as unpaid because `totalPaid` from payments = 0

### Bug 3: Test results disappear due to query limit
`useTestResultsQuery` has `.limit(2000)`. A tuition with 50 students × 50 tests = 2500 results. Older test marks simply vanish from the UI because they exceed the limit. Same issue with `useFeesQuery` having `.limit(500)`.

### Bug 4: Payments fetched without tuition filter
`fetchPayments()` in `Fees.tsx` does `supabase.from('fee_payments').select('*')` with no tuition filter. While RLS handles isolation, it fetches ALL historical payments with no limit, which can be slow and cause timeouts on large datasets.

---

## Fix Plan

### Fix 1: Move payments to React Query (eliminates stale state)
**File: `src/hooks/queries/useFeesQuery.ts`**
- Add a new `usePaymentsQuery(tuitionId)` hook using React Query
- Filter by tuition via join (like fees query does)
- This eliminates the stale `useState` + `useEffect` pattern

### Fix 2: Fix fee status calculation to use database truth
**File: `src/pages/Fees.tsx`**
- Replace `useState` payments with the new `usePaymentsQuery`
- In `handleRecordPayment`: after inserting the payment, **re-query the actual total from the database** before deciding paid/partial status, instead of relying on stale local state
- Or simpler: fetch payments for that specific fee after insert, then calculate

### Fix 3: Fix "Mark as Paid" to always create a payment record
**File: `src/components/fees/FeesList.tsx`**  
- `handleBulkMarkPaid` must record a payment entry for each fee (like `handleMarkAsPaid` does for single fees)
- This ensures `fee_payments` always has a matching record when status = 'paid'

### Fix 4: Remove dangerous query limits / use pagination
**File: `src/hooks/queries/useTestsQuery.ts`**
- Remove the `.limit(2000)` on test results — instead, scope results to only the tests already fetched (which are limited to 100 most recent)
- Use `test_id.in(testIds)` filter instead of a blanket limit

**File: `src/hooks/queries/useFeesQuery.ts`**
- Remove `.limit(500)` or increase significantly, since fees are already scoped by tuition_id and optional month filter

### Fix 5: Fix RecordPaymentDialog JSX nesting error
**File: `src/components/fees/RecordPaymentDialog.tsx`**
- Lines 273-274 have misplaced JSX (notes counter/error shown inside the reference field block). This causes notes validation display to break.

---

## Files Modified
| File | Change |
|------|--------|
| `src/hooks/queries/useFeesQuery.ts` | Add `usePaymentsQuery` hook, remove/increase limits |
| `src/pages/Fees.tsx` | Use React Query for payments, fix status calculation |
| `src/components/fees/FeesList.tsx` | Fix bulk mark-paid to record payments |
| `src/hooks/queries/useTestsQuery.ts` | Scope test results to fetched test IDs instead of blanket limit |
| `src/components/fees/RecordPaymentDialog.tsx` | Fix misplaced JSX |

