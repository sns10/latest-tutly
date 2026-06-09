## What's happening

After clicking **Record Payment → Submit**, the page becomes unresponsive on the client's laptop. The console shows no JS errors (just a harmless dialog a11y warning and a websocket reconnect). That points to a render/state issue in the submit handler, not a server error.

Walking the code I found three things that, together on a laptop with a lot of fee data, can cause a freeze right at submit time:

1. **`RecordPaymentDialog` resets its state on every re-render of the parent.** Its `useEffect` depends on `existingPayments`, but `FeesList` passes `getFeePayments(...)` which returns a **new array reference on every render** (and even returns a brand-new `EMPTY_PAYMENTS = []` declared inside the component body). So while submitting (and again during the post-submit cache refetch), the dialog keeps re-running `setAmount/setPaymentMethod/setReference/setNotes/setErrors/setPaymentDate` — re-renders cascade with the parent.
2. **`pendingReceiptFor` has no safety timeout.** If the cache update is slow or the mutation throws after the user clicked submit, the watcher effect keeps running on every fees/payments change forever and the receipt never auto-opens — looks like a freeze.
3. **The receipt auto-opens on the same tick as the cache refetch finishes** — on a tuition with thousands of payments, `paymentsByFeeId` is a heavy re-build, and mounting `FeeReceipt` (with `html2canvas` + `jspdf` imports) on the same frame can stall the main thread for several seconds on a low-end laptop.

## Fix (frontend only — no DB changes)

### A. `src/components/fees/RecordPaymentDialog.tsx`
- Change the reset `useEffect` so it **only depends on `open`** (and `fee.id`). Compute the initial remaining amount inside the effect from the current props at the moment the dialog opens. This stops the cascade of state resets while the user is typing or while the parent re-renders mid-submit.
- Disable the Submit button immediately and call `onOpenChange(false)` *before* `onRecordPayment(...)` so the dialog unmounts cleanly even if the mutation takes a moment.

### B. `src/components/fees/FeesList.tsx`
- Move `EMPTY_PAYMENTS` to **module scope** (single stable reference) so `getFeePayments` returns the same `[]` for fees with no payments yet. This stabilizes props to child dialogs.
- Add a **safety timeout** to `pendingReceiptFor`: if not consumed within 8 seconds, clear it and toast "Payment saved — open receipt from the row menu". Prevents the stuck-watcher symptom.
- Defer the auto-open of the receipt by one frame (`requestAnimationFrame(() => setReceiptOpen(true))`) so the heavy paymentsByFeeId re-build paints first, then `FeeReceipt` mounts on the next frame instead of stalling the same frame.
- In the submit handler inside the `RecordPaymentDialog` block, call `setPaymentDialogOpen(false)` and `setSelectedFeeForPayment(null)` *before* invoking `onRecordPayment(...)` so the dialog tear-down doesn't happen mid-mutation.

### C. `src/components/fees/FeeReceipt.tsx`
- Lazy-load `html2canvas` and `jspdf` only inside `handleDownloadPDF` (dynamic `await import(...)`). They currently load at receipt mount; on a slow laptop that parse cost lands right after submit. With lazy import the receipt opens instantly and the heavy libs only load when the user actually clicks "Download PDF".

## Out of scope

No database / RPC / RLS changes. No changes to the receipt template, payment history, fee generation, or reports. No new dependencies.

## Verification

1. Open the Fees page on the laptop where it froze.
2. Record a payment for any unpaid fee.
3. The dialog should close immediately, a toast confirm, and the receipt should open within ~1 second without the page freezing.
4. Cancelling the dialog and re-opening should still pre-fill the remaining amount correctly.
5. Marking a fee as paid (which also routes through `onRecordPayment`) should behave the same.