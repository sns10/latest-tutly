## Goal
Let tuition admins fix human errors in fee/payment data: void a payment, edit a recorded payment (date, method, reference, amount, notes), and flip a fee between paid/unpaid without deleting it.

## Why it's feasible
The backend already has most of what we need:
- `void_fee_payment(payment_id)` — removes a single payment and recomputes fee status. Already wired in `useVoidFeePaymentMutation`.
- `void_fee_payments(fee_id)` — clears all payments on a fee and resets to unpaid. Already wired in `useVoidFeePaymentsMutation`.
- `record_fee_payment(...)` — for re-recording a corrected payment.
- `student_fees` and `fee_payments` tables have RLS scoped by tuition.

What's missing is (a) an "edit payment" RPC and (b) UI surfaces for these actions.

## Scope (what the admin will be able to do)

1. **Payment History dialog (per fee) — primary edit surface**
   - Each payment row gets two actions: **Edit** and **Void**.
   - Void already exists; expose it more clearly with a confirm dialog.
   - Edit opens a dialog pre-filled with: amount, payment date, method, reference, notes. On save, the payment is updated and the parent fee's status/paid_date is recomputed.

2. **Reset entire fee** (already exists via `void_fee_payments`)
   - Surface as "Reset fee to unpaid" in the row 3-dot menu with a confirm dialog. Clears all payments and marks the fee unpaid.

3. **Mark fee paid / unpaid manually** (toggle without a payment record)
   - Row 3-dot menu: "Mark as paid (no payment record)" and "Mark as unpaid".
   - Used for adjustments outside the payment ledger (e.g. waived/written-off). We will keep this conservative: only allow when there are no `fee_payments` rows attached, to avoid silently desyncing the ledger. Otherwise the admin must void payments first.

4. **Audit trail**
   - Every edit/void writes an `audit_logs` row (action, fee_id, payment_id, before/after JSON, actor). Read-only for admins.

## UX changes

- `PaymentHistoryDialog`: add Edit (pencil) and Void (trash) buttons per row, plus an "Edit payment" sub-dialog.
- `FeesList` row menu: add "Reset fee", "Mark as paid", "Mark as unpaid" (the last two are gated as described).
- Confirms use the existing AlertDialog pattern.
- All dialogs use the existing `restoreBodyPointerEvents` unlock pattern to avoid the stuck-pointer issue we just fixed.

## Backend changes
- New SECURITY DEFINER RPC `edit_fee_payment(p_payment_id, p_amount, p_payment_method, p_reference, p_notes, p_payment_date)`:
  - Tuition-scope check (same pattern as `void_fee_payment`).
  - Overpayment guard (sum of payments after edit ≤ fee amount).
  - Updates the payment, recomputes total paid, sets fee status to paid/partial/unpaid and paid_date accordingly.
- Optional new RPC `set_fee_status_manual(p_fee_id, p_status)` that only succeeds when there are zero `fee_payments` on the fee (keeps ledger consistent).
- Both RPCs write an `audit_logs` entry.

## Files to touch
- New migration: `edit_fee_payment` + `set_fee_status_manual` functions, grants to authenticated.
- `src/hooks/queries/useFeesMutations.ts`: add `useEditFeePaymentMutation`, `useSetFeeStatusManualMutation`.
- `src/components/fees/PaymentHistoryDialog.tsx`: row actions + Edit sub-dialog.
- `src/components/fees/FeesList.tsx`: row menu items + confirms.
- (No change to `record_fee_payment` or existing void RPCs.)

## Out of scope (ask if you want these later)
- Editing the fee itself (amount, due date, fee type) — possible but separate.
- Bulk edit across many fees at once.
- Refund/partial reversal accounting (we treat void as delete; no negative-amount entries).

Want me to go ahead with this, or trim/extend any of the four capabilities above?