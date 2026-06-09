# Plan

The page is most likely getting stuck behind an invisible dialog lock after `Record Payment` closes. The strong clue is: the screen still scrolls, nothing visibly crashes, no receipt appears, but all buttons stop responding.

## What I’ll change

1. **Stabilize the payment dialog teardown**
   - Add a dedicated close handler in `src/components/fees/FeesList.tsx` for the payment dialog.
   - When the dialog closes, clear both `paymentDialogOpen` and `selectedFeeForPayment` together and force dialog cleanup for body click-lock state.

2. **Remove the risky automatic receipt popup after submit**
   - Stop auto-opening `FeeReceipt` immediately after a payment is saved.
   - Keep receipt access through the existing row menu / payment history actions.
   - Replace the current auto-receipt watcher with a success toast only, so one dialog is not opening while another is still tearing down.

3. **Fully unmount fee-related dialogs when closed**
   - Update `FeesList` dialog state so `FeeReceipt`, `PaymentHistoryDialog`, and reminder/payment dialogs clear their selected item/state on close.
   - This avoids hidden Radix overlays or body `pointer-events` locks persisting after close.

4. **Add an explicit click-unlock safety net on close**
   - Reuse the existing dialog safety helper to restore pointer events whenever any fee dialog closes.
   - Apply this specifically around the payment/receipt flow where the freeze is happening.

## Technical details

**Files to update**
- `src/components/fees/FeesList.tsx`
- `src/components/fees/FeeReceipt.tsx` (only if needed for close cleanup)
- `src/components/fees/RecordPaymentDialog.tsx` (only if a tiny close-handling adjustment is still needed)

**Implementation approach**
- Replace ad-hoc `setOpen(false)` calls with named close handlers.
- Gate dialog rendering by both `open` state and selected entity where appropriate.
- Clear `receiptFee` / `receiptPayment` on receipt close instead of leaving a hidden mounted dialog tree.
- Remove `pendingReceiptFor` auto-open behavior if it is the source of the lock race.

## Expected result

After submitting a payment:
- the payment is saved,
- the page stays clickable,
- tabs/actions/three-dot menus keep working,
- the next student’s payment can be recorded immediately.

If you approve, I’ll implement this focused fix now.