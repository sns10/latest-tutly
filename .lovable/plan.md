## Goal
Make the single-payment void action reliable so the chosen payment is actually removed from the backend, and every fee surface updates to the correct state afterward.

## What I found
- This is not only a cache problem.
- For **Asna Ansarudheen**, the May fee is still stored in the database as:
  - fee amount: ₹1400
  - payments still present: ₹1000 + ₹400
  - current status: `paid`
- Because both payment rows still exist after refresh, the single-payment void did not persist.
- Also, if one of those two payments is removed, the fee should become **partial**, not unpaid.

## Plan
1. **Harden the void-payment client flow**
   - Update `PaymentHistoryDialog` so the confirm action waits for the mutation result instead of closing immediately.
   - Surface backend failures clearly in the dialog flow instead of silently closing and making it look successful.
   - Prevent double-submits or row mismatch while a void is in progress.

2. **Verify the backend function contract and caller**
   - Check that the app is calling `void_fee_payment(p_payment_id)` with the exact selected payment id.
   - Confirm the mutation reads and handles RPC errors correctly.
   - If needed, tighten the typing/response handling so failures cannot be mistaken for success.

3. **Fix the stale row/status propagation after a successful void**
   - Keep the current fee/payment invalidations.
   - Ensure the payment history dialog and selected row state are cleared only after the refetch reflects the deleted payment.
   - Make the fee row status recompute visually to `partial` or `unpaid` based on remaining payments.

4. **Validate against the reported case**
   - Re-test the Asna Ansarudheen scenario.
   - Confirm these outcomes:
     - the specific payment disappears from Payment History,
     - the fee row status changes correctly,
     - refresh does not bring the deleted payment back,
     - no duplicate/stale receipt or dialog state remains open.

## Files likely involved
- `src/components/fees/PaymentHistoryDialog.tsx`
- `src/hooks/queries/useFeesMutations.ts`
- possibly the backend function wiring if the client call shape is off

## Expected result
After voiding one payment:
- that exact payment is gone from the database,
- Payment History no longer shows it,
- the fee row shows the correct recalculated status,
- the state remains correct even after page refresh.