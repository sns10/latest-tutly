# Fee Section Hardening Plan

Three parallel audits (data integrity, UX smoothness, product logic) surfaced ~30 issues. Below is a prioritized, deduplicated fix plan. Grouped by severity. Everything is fix-in-place — no schema redesign, no breaking changes.

## P0 — Integrity & Security (must fix)

**1. Lock down `record_fee_payment` RPC (DB migration)**
- Add tenancy check: verify `p_fee_id` belongs to the caller's tuition (`get_user_tuition_id(auth.uid())`) before doing anything. Reject otherwise.
- Add `SELECT ... FOR UPDATE` on `student_fees` row to serialize concurrent payments and prevent the "two clicks → wrong status" race.
- Reject overpayment: if `v_total_paid > v_fee_amount`, raise an exception. Prevents stale-cache double-pay.
- Use the passed-in `p_payment_date` consistently for `paid_date` (already done).

**2. Stop issuing receipts for unconfirmed payments**
- `FeesList.tsx` Mark-as-Paid + RecordPaymentDialog callback currently build a `temp-${Date.now()}` payment object and open the receipt *before* the mutation resolves.
- Fix: wait for `useRecordPaymentMutation` `onSuccess` to fire, then open the receipt using the real persisted payment row (refetch the just-created payment via the invalidated `feePayments` query). No more `temp-` ids on printed paper.

**3. Double-submit guards across all mutating buttons**
- Thread `isPending` from `useRecordPaymentMutation`, `useAddFeeMutation`, `useAddFeesBatchMutation`, `useUpdateFeeStatusMutation`, `useDeleteFeeMutation` down to:
  - `RecordPaymentDialog` "Record Payment"
  - `AddCustomFeeDialog` "Add Fee"
  - `FeesList` "Generate Fees" (dialog confirm), "Mark N as Paid"
  - `FeeReceipt` "Download PDF" / "Print" (local `isGenerating` state)
- `disabled={isPending}` + spinner label. Kills the duplicate-payment class of bugs.

**4. WhatsApp reminder shows stale full amount on partial-paid fees** (HIGH per logic audit)
- `WhatsAppReminderDialog` currently uses `f.amount` and sums it for total due. Parents who paid ₹500 of ₹1500 still see ₹1500 owed.
- Fix: pass `paymentsByFeeId` (or `totalPaidByFeeId`) into the dialog; compute `remaining = f.amount - paid` per line and `sum(remaining)` for the total. Also add `useEffect(() => setMessage(defaultMessage), [open, student.id])` so the message resets when reopening for a different student.

**5. Mark-as-Unpaid leaves payment history behind → contradiction**
- `CustomFeesManager.handleMarkAsUnpaid` and `FeesList` reset-to-unpaid path call `onUpdateFeeStatus(id, 'unpaid')` but leave `fee_payments` rows intact.
- Fix: add a `void_fee_payments` RPC (or simple delete with tenancy check) that deletes all payments for the fee inside a transaction, then sets status to `unpaid` and `paid_date` to null. Show a confirm dialog ("This will erase N payment records").

**6. `overdue` status filter never matches DB rows**
- `useFeesQuery` passes `.eq('status', 'overdue')` but DB stores `'unpaid'` (overdue is derived client-side).
- Fix: when `filters.status === 'overdue'`, translate to `.eq('status', 'unpaid').lt('due_date', today)` server-side.

**7. Overdue UTC-vs-local date drift**
- `useFeesQuery.ts` derives `today` via `toISOString()` (UTC). For IST tuitions a fee due today after 18:30 IST flips to "overdue" prematurely.
- Fix: use `format(new Date(), 'yyyy-MM-dd')` from `date-fns` (local time) — already the pattern elsewhere.

**8. Delete-fee cache invalidation gap**
- `useDeleteFeeMutation` invalidates `['fees']` but not `['feePayments']` or `['todayPayments']`. Stale phantom-collected amounts linger up to 30 min.
- Fix: invalidate all three keys.

## P1 — Smoothness / "stuck buttons" feel

**9. `FilterContent` inline-component remount (root cause of mobile filter lag)**
- `FeesList.tsx` defines `FilterContent` *inside* the component body — React treats it as a new type every render, fully unmounts/remounts the Sheet's contents on every keystroke.
- Fix: extract to a top-level component (or inline the JSX twice — desktop + sheet).

**10. `FeeCard` memoization is broken**
- Every callback prop (`onSelect`, `onMarkAsPaid`, `onRecordPayment`, `onSendReminder`, `onViewHistory`, `onPrintReceipt`) is a fresh arrow per `.map()` iteration → `React.memo` always re-renders.
- Fix: `useCallback` stable handlers that accept `fee`/`feeId`, and have `FeeCard` close over them. Or pass a single `actions` object built with `useMemo`.

**11. Generate Monthly Fees freezes UI on big tuitions**
- Synchronous `students × fees × classFees` `.find()` scan in the click handler.
- Fix: pre-build `Set<"studentId|feeType">` from `fees` and `Map<class, amount>` from `classFees`, run loop in a `requestIdleCallback` or `setTimeout(0)`, show a spinner while running.

**12. Idempotent monthly-fee generation (server side)**
- No DB uniqueness on `(student_id, fee_type)`. Double-click could create duplicates if cache is stale.
- Fix: add partial unique index `UNIQUE(student_id, fee_type) WHERE fee_type LIKE 'Monthly Fee - %'` and use `INSERT ... ON CONFLICT DO NOTHING` in batch insert (or pre-check via DB).

**13. Misc render/memo cleanups**
- `FeeReports.tsx`: replace `students.find()` per row with a `studentsById` Map (multiple call sites).
- `FeesList.tsx`: replace `getCurrentMonth()` raw calls (lines 424, 652, 655) with the `currentMonth` memo.
- `FeesList.tsx`: memoize the inline `fees.filter(...)` passed as `unpaidFees` to `WhatsAppReminderDialog`.
- `CustomFeesManager`: add the same 150ms search debounce already in `FeesList`.
- `AddCustomFeeDialog`: when "apply to class" is used, batch via `onAddFeesBatch` (already passed down) instead of a sequential `await onAddFee` loop, and disable the button while pending.

## P2 — Logic refinements

**14. Receipt should show prior payments + running balance**
- `FeeReceipt` shows only "Total Amount" and "This Payment" — confusing for installment payers.
- Fix: add "Previously Paid", "This Payment", "Balance After" rows; pass `existingPayments` through.

**15. Allow voiding a single payment (today only deleting the entire fee works)**
- `PaymentHistoryDialog` currently has Print Receipt per row but no Delete.
- Fix: add a "Void Payment" action (admin confirm) → new `void_fee_payment(p_payment_id)` RPC that does tenancy check, deletes the payment row, recomputes the fee status from remaining payments (paid/partial/unpaid).

**16. Month filter dead-code branch hides custom fees**
- `FeesList.tsx` line ~239: `fee.feeType === 'monthly'` branch is dead (no fee uses literal `'monthly'`); custom fees with a `dueDate` in the selected month are hidden.
- Fix: filter by `dueDate` range when `feeType` doesn't include the month string. Same fix in `FeeDashboard` (lines 54-55, 85-86).

**17. Float precision on partial-payment preview**
- `RecordPaymentDialog` line 148: round the "remaining after this" preview to whole rupees (`Math.round`).

## Out of scope (documented, not fixed now)

- Discount / late-fee columns exist in DB but no UI surfaces them. The RPC currently ignores them; once UI is added the RPC math (`v_total_paid >= v_fee_amount - discount + late_fee`) and TS `formatFees` mapping must update together. Flag for a separate "Discounts & Late Fees" milestone.
- List virtualization (>200 rows) — defer until a real tuition reports scroll jank; the memo fixes above resolve the typical lag first.
- Auto-generate fee for newly added student mid-month — defer (current "Generate Fees" re-run already covers it idempotently after the unique-index fix).

## Files touched

```text
supabase/migrations/<new>.sql                 (rpc hardening + void payment + unique index)
src/hooks/queries/useFeesQuery.ts             (timezone, overdue filter, cache invalidation, isPending exposure)
src/components/fees/FeesList.tsx              (FilterContent hoist, useCallback, monthly-gen prebuild, async receipt, disabled buttons, getCurrentMonth cleanup, useMemo unpaidFees, void action)
src/components/fees/FeeCard.tsx               (consume stable callbacks)
src/components/fees/FilterContent.tsx         (new — extracted)
src/components/fees/RecordPaymentDialog.tsx   (isPending disable, rounded preview)
src/components/fees/AddCustomFeeDialog.tsx    (batch insert, isPending disable)
src/components/fees/CustomFeesManager.tsx     (search debounce, mark-unpaid void confirm)
src/components/fees/WhatsAppReminderDialog.tsx (remaining-balance math, reset effect)
src/components/fees/PaymentHistoryDialog.tsx  (void payment action)
src/components/fees/FeeReceipt.tsx            (prior payments rows, print/PDF disable while busy, real payment id only)
src/components/fees/FeeReports.tsx            (studentsById map)
src/components/fees/FeeDashboard.tsx          (month filter fix)
```

## Verification

After implementation:
- Concurrent double-click on "Record Payment" → only one payment row, correct status.
- Cross-tuition fee_id in RPC → rejected.
- Partial payment → WhatsApp message shows correct remaining; receipt shows prior + this + balance.
- Mark unpaid → confirm dialog, payments cleared, history empty.
- Overdue filter returns the same rows the UI marks orange.
- Generate Fees on a 200-student tuition → no visible freeze, no duplicates on double-click.
- Filter sheet on mobile → no remount flicker while typing.
