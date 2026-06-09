## Goal
After editing, voiding, resetting, or status-toggling a fee/payment, every fee surface in the app (Fees list, Custom Fees, Activity feed, Dashboard tiles, Reports, Payment History dialog, Receipts) must reflect the new state without a manual reload.

## Current state (what already works)
- `useEditFeePaymentMutation`, `useVoidFeePaymentMutation`, `useVoidFeePaymentsMutation`, `useRecordPaymentMutation`, `useDeleteFeeMutation` all invalidate the three core keys: `['fees', tuitionId]`, `['feePayments', tuitionId]`, `['todayPayments', tuitionId]`.
- `Fees.tsx` reads `useFeesQuery` + `usePaymentsQuery` and threads the arrays down. Because the queries refetch on invalidation, `FeesList`, `PaymentActivityFeed`, `CustomFeesManager`, `FeeReports`, and an open `PaymentHistoryDialog` all re-render with fresh data automatically.

## Gaps to close
1. **`useUpdateFeeStatusMutation`** (legacy "mark paid/unpaid" path used by `FeesList`) invalidates only `['fees']`. If a future status change is ever called while payments exist, the activity feed and Today's collection stay stale. Add `feePayments` + `todayPayments` invalidations for consistency with the other fee mutations.
2. **`useSetFeeStatusManualMutation`** (new manual toggle) invalidates only `['fees']`. Even though it refuses to run when payments exist, add the same two extra invalidations so behaviour is uniform and future-proof.
3. **`useAddFeeMutation` / `useAddFeesBatchMutation`** invalidate only `['fees']` (and `classFees`). The Activity feed and Today's collection don't depend on fee creation, so no change needed — call this out so we don't over-invalidate.
4. **`PaymentHistoryDialog`**: when the last payment is voided or edited to a smaller amount via the inner Edit dialog, the parent's `payments` array refreshes but the dialog's local "selected payment for receipt" state can point at a deleted row. Guard: when `payments` no longer contains `paymentToVoid`/`paymentToEdit`/`selectedPaymentForReceipt`, clear that local state and close the child dialog.
5. **`FeeReceipt`** receives `payment` + `existingPayments` as props. After an edit, the receipt body should re-render with the updated amount/date/method. Confirm by passing the live payment object (looked up by id from the refreshed `payments` array) instead of the snapshot captured at click time. If the payment was voided while the receipt is open, auto-close the receipt.
6. **`FeesList` row state**: the row menu confirms (`Reset fee`, `Mark as unpaid`) hold a `feeId` in local state. After the mutation succeeds, ensure the AlertDialog closes and the local "target fee" state is cleared so a re-open shows the new status, not the stale one.
7. **`useUserTuition` / dashboard tiles**: the dashboard's fee numbers (Daily Summary, fee collection card) read from the same `useFeesQuery` + `usePaymentsQuery` hooks, so they refresh automatically — no extra work, just verify.

## Files to touch
- `src/hooks/queries/useFeesQuery.ts` — extend `useUpdateFeeStatusMutation` invalidations.
- `src/hooks/queries/useFeesMutations.ts` — extend `useSetFeeStatusManualMutation` invalidations.
- `src/components/fees/PaymentHistoryDialog.tsx` — sync local "selected/edit/void" state with the live `payments` prop; look up live payment for the receipt.
- `src/components/fees/FeeReceipt.tsx` — auto-close if the underlying payment disappears from `existingPayments`.
- `src/components/fees/FeesList.tsx` — clear local "target fee" state on mutation success and on dialog close.

## Out of scope
- New backend changes (RPCs are already correct and write `audit_logs`).
- Changing query stale times or switching to optimistic updates.
- Caching/refresh for super-admin cross-tuition views.
