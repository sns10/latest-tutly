
## Problem

The Fee section becomes laggy/unresponsive (buttons take time to react, typing in search stutters, switching tabs feels stuck). Root cause is **expensive work re-running on every render and every keystroke** — not a data/network issue.

### What's actually slow

**`src/components/fees/FeesList.tsx`**
- For each visible row, the component calls `getStudentName`, `getStudentClass`, `getTotalPaid`, `getFeePayments`, `getStudent` — each does `students.find()` or `payments.filter()`. With ~150 students and hundreds of payments × hundreds of fee rows, that's tens of thousands of array scans per render.
- Search input (`searchQuery`) is unthrottled, so every keystroke triggers the full filter + re-render of every row + all the lookups above.
- `getAvailableMonths()` and `uniqueClasses` are rebuilt every render (also rebuilt twice — desktop filter card and mobile sheet).
- `selectedFees` (a `Set`) is cloned on every checkbox toggle — fine, but the parent re-renders all rows because rows aren't memoized.

**`src/components/fees/PaymentActivityFeed.tsx`**
- `paymentsByDate` reduce + sort runs on every render.
- For each payment row, `getFeeForPayment` and `getStudentForPayment` each do `.find()` over fees and students. Over months of activity this is the worst hotspot.

**`src/pages/Fees.tsx`**
- Passes `payments.map(...)` inline to `PaymentActivityFeed` — new array reference every render, killing any downstream memoization and forcing the heavy reduce/sort above to re-run even when nothing changed.

**`src/components/fees/CustomFeesManager.tsx`**
- Same `students.find()` per row in the table, plus a partial-amount calculation that does `payments.filter(...)` inside a `reduce` over custom fees (N×M again).

The combined effect is long synchronous tasks on the main thread — that's what makes buttons appear unresponsive (clicks register but the handler is queued behind the render).

## Fix

Purely frontend / presentation. No business-logic or schema changes.

### 1. `src/components/fees/FeesList.tsx`
- Build `useMemo` lookup maps once per data change:
  - `studentsById: Map<string, Student>`
  - `paymentsByFeeId: Map<string, FeePayment[]>` (sorted desc by createdAt once)
  - `totalPaidByFeeId: Map<string, number>`
- Replace `getStudentName / getStudentClass / getStudent / getFeePayments / getTotalPaid` with map lookups.
- `useMemo` for `uniqueClasses` and `availableMonths` (compute once).
- Debounce `searchQuery` used by the filter (keep `searchInput` as immediate state for the input, derive a debounced value ~150 ms for `filteredFees`).
- Extract the row body into a small memoized component (`FeeRow` for desktop table). `FeeCard` already exists for mobile — wrap it in `React.memo` and pass primitive props so it skips re-renders when unrelated state changes (e.g. opening a dropdown).
- Compute `totalAmount` / `paidAmount` from the memoized maps so the summary doesn't re-scan payments.

### 2. `src/components/fees/PaymentActivityFeed.tsx`
- `useMemo` for `feesById`, `studentsById`, and the `paymentsByDate` grouping + sorted `dateKeys`.
- Resolve student/fee per row via map lookups instead of `.find()`.
- Wrap the per-row content in a memoized child so opening the receipt dialog doesn't re-render every other row.

### 3. `src/pages/Fees.tsx`
- Move the `payments.map(...)` adapter passed to `PaymentActivityFeed` into a `useMemo` so the prop reference is stable across renders.

### 4. `src/components/fees/CustomFeesManager.tsx`
- Same `studentsById` and `paymentsByFeeId` memo treatment.
- Replace the nested `reduce`/`filter` in the `stats` memo with one pass that uses `paymentsByFeeId`.

### Validation

- After edits, reload `/` → Fees tab and confirm:
  - Typing in the search field is smooth (no per-keystroke jank).
  - Switching between Activity / Fees / Custom / Structure / Reports tabs is instant.
  - Action buttons (Mark as Paid, Record Payment, dropdowns) respond on first click.
- Spot-check with `browser--performance_profile` before/after if needed to confirm long-task duration drops.

### Out of scope

- No changes to queries, mutations, RLS, or DB schema.
- No change in visible UI/UX besides the lag going away.
- No new dependencies; debounce is implemented inline with `useEffect` + `setTimeout`.
