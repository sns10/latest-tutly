# Fix: "Total Paid ₹0" when fee is actually paid

## What you're seeing
On the **Students** page, opening a student → **Fees** tab shows:
- Fee record: **₹2,000 — Paid** ✅ (correct)
- Summary: **Total Paid ₹0**, **Pending ₹2,000** ❌ (wrong)

## Root cause
The fee summary cards ("Total Paid" / "Pending") in `StudentDetailsDialog` are computed from a `feePayments` prop:

```ts
feePayments.reduce((sum, p) => sum + p.amount, 0)
```

But `src/pages/Students.tsx` **never passes** `feePayments` when rendering the dialog (line 382–402). The prop defaults to `[]`, so the math is always `Total - 0 = full amount pending`, even when the fee row itself is marked Paid.

The dialog already supports it — `feePayments?: FeePayment[]` is declared (line 41) and used by `getPaymentsForFee` / `getTotalPaidForFee`. It's just not being supplied.

A secondary issue: `pendingFees` (used elsewhere in the dialog summary) filters by `status === 'unpaid' | 'overdue'` only — partially-paid fees aren't counted as pending. We'll align the math to use payments as the source of truth.

## The fix

### 1. Fetch payments on the Students page
In `src/pages/Students.tsx`, use the existing `usePaymentsQuery(tuitionId)` hook (already used by `Fees.tsx`) to load all fee payments for the tuition.

### 2. Pass them to the dialog
Filter payments to those belonging to the selected student's fees, and pass as the `feePayments` prop:

```tsx
const studentFeeIds = fees.filter(f => f.studentId === selectedStudent.id).map(f => f.id);
const studentPayments = payments.filter(p => studentFeeIds.includes(p.feeId));

<StudentDetailsDialog
  ...
  fees={fees.filter(f => f.studentId === selectedStudent.id)}
  feePayments={studentPayments}  // <-- new
  ...
/>
```

### 3. Map field name correctly
`usePaymentsQuery` returns `{ feeId, amount, ... }` (camelCase), but the dialog reads `p.fee_id` and the type uses snake_case. Map to the shape the dialog expects (or update the dialog to use camelCase consistently — pick one). Lowest-risk option: map at the call site:

```ts
const studentPayments = payments
  .filter(p => studentFeeIds.includes(p.feeId))
  .map(p => ({ id: p.id, fee_id: p.feeId, amount: p.amount, payment_date: p.paymentDate, /* ...other fields needed */ }));
```

### 4. Also fix `StudentAlertsCard.tsx` (same issue)
It also renders `StudentDetailsDialog` without `feePayments`. Same fix — fetch payments via `usePaymentsQuery` and pass through.

## Files to change
| File | Change |
|---|---|
| `src/pages/Students.tsx` | Add `usePaymentsQuery`, derive per-student payments, pass to dialog |
| `src/components/StudentAlertsCard.tsx` | Same pattern |
| `src/components/StudentDetailsDialog.tsx` | (Optional) standardize on `feeId` camelCase to remove the field-name mapping step |

## Risk
- Low. Only adds a query that's already used elsewhere and a prop the dialog already accepts.
- No DB / RLS changes.
- "Pending Fees" summary at line 560–561 will keep working (it sums fee.amount for unpaid/overdue), but consider switching it to `totalFees - totalPaid` for full consistency. Optional, can be a follow-up.

## What stays the same
- Fee data, payment data, RLS, and database schema are all correct.
- The fee row status badge ("Paid") was already accurate.
- Admin Fees page is unaffected (already passes payments correctly).
