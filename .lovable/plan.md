
## Changes

### 1. Add "Payment Date" field to Record Payment dialog

When recording a fee payment, add a date picker so admins can backdate the payment (e.g., fee received yesterday but marked today). Defaults to today.

**Files to change:**

- **`src/components/fees/RecordPaymentDialog.tsx`** — Add a date picker field (using Popover + Calendar) between the amount and payment method sections. State defaults to today. Pass the selected date through `onRecordPayment` callback. Update the prop signature to include `paymentDate?: string`.

- **`src/components/fees/FeeCard.tsx`** / **`src/components/fees/FeesList.tsx`** — Update `onRecordPayment` callback signatures to accept the new `paymentDate` parameter and pass it through.

- **`src/pages/Fees.tsx`** — Update `handleRecordPayment` to accept and forward the `paymentDate` parameter.

- **`src/hooks/queries/useFeesQuery.ts`** — Update `useRecordPaymentMutation` to accept `paymentDate` and pass it to the `record_fee_payment` RPC.

- **Database migration** — Alter the `record_fee_payment` function to accept an optional `p_payment_date` parameter (defaults to `CURRENT_DATE`). Use it when inserting into `fee_payments` and when setting `paid_date` on the fee.

### 2. Allow WhatsApp message when all students are present

Currently the WhatsApp button only shows when `stats.absent > 0`. Change this so the button appears whenever attendance has been marked for the selected class (even if everyone is present). The dialog already handles the all-present case with a "All students present on time!" message.

**File to change:**

- **`src/components/AttendanceTracker.tsx`** — Change the condition on line 587 from `stats.absent > 0` to `stats.total > 0` (or `stats.present + stats.absent + stats.late > 0`). Update button text to show "All Present" when no absentees, otherwise show the count as before.

### Data consistency

- The `record_fee_payment` RPC is `SECURITY DEFINER` and handles status calculation atomically — no risk of inconsistency from adding a date parameter.
- The date picker will be constrained to not allow future dates.
- Default remains today, so existing behavior is preserved if the admin doesn't change the date.
