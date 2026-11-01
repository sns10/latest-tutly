# Class-wise Outstanding Fee Report

## What the center admin gets
A new **Outstanding by Class** report under Fees → Reports.

1. Pick a **class** (or All classes), optional division, and an **"up to" month** (e.g. October).
2. Tap **Generate report**. Nothing loads until this button is tapped.
3. The report covers fees due from the **start of the academic year up to the end of the chosen month**. Academic year start month defaults to June and can be changed in the report (saved per device).
4. Only students with unpaid balance are listed, **sorted by highest outstanding first**, so heavy defaulters are at the top.

### Per-student columns
- Roll no, name, class/division, parent phone
- **Months missed**: count plus month names (e.g. "4 — Jul, Aug, Sep, Oct")
- **Total paid so far** (in the period)
- **Outstanding** (unpaid + partially paid remainder)
- **Late fee** (from class late-fee settings, for overdue items)
- **Total due** = outstanding + late fee
- **Last payment date** (or "Never")
- Risk tag: High (3+ months missed), Medium (2), Low (1)

### Summary on top
Students with dues, total outstanding, total late fee, grand total due, count of High-risk students.

### Output
- On screen (mobile: cards, desktop: table)
- **PDF download** (A4, center name/logo, summary + table)
- **Excel download**

## Technical details
- New SECURITY DEFINER RPC `get_class_outstanding_report(_tuition_id, _class, _division_id, _from date, _to date)` aggregating `student_fees` + `fee_payments` in the database; checks caller is that tuition's admin or super admin; EXECUTE revoked from anon. Returns one row per student with unpaid balance — avoids downloading all fees to the phone.
- New hook `useOutstandingReport` using React Query with `enabled: false`, triggered only by `refetch()` on the Generate button; no refetch on focus/mount.
- New component `src/components/fees/OutstandingFeeReport.tsx`, added as a new report option in `FeeReports.tsx`.
- PDF via existing `jspdf` (+ autotable pattern used by student PDF export), Excel via existing `xlsx`.
- Small unit test for the months-missed / late-fee / risk calculation helper.
