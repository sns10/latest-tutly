
# Proactive Student Alerts System

## Overview
Build an automated alerts system that continuously monitors student data and surfaces actionable warnings when students show concerning patterns -- specifically 3+ consecutive absences or a 20%+ drop in test scores. These alerts will appear on the admin dashboard and link directly to the student's details for follow-up.

## What You'll See

### Alerts Banner on Dashboard
A new "Student Alerts" section will appear on the Index page (below the Daily Summary card) showing:
- A collapsible card with a count badge (e.g., "3 alerts need attention")
- Each alert shows the student name, class, alert type, and severity
- Color-coded by severity: red for critical (5+ absences or 30%+ drop), amber for warning
- Click any alert to open the student details dialog
- Dismiss individual alerts (remembered for the session)

### Alert Types

**Consecutive Absence Alert**
- Triggers when a student has 3 or more consecutive absent days (based on days they had scheduled classes)
- Shows: "Ravi Kumar (10th) - Absent for 5 consecutive days"
- Red severity for 5+ days, amber for 3-4 days

**Score Drop Alert**
- Compares a student's average score from their last 3 tests against their previous 3 tests
- Triggers when the drop is 20% or more
- Shows: "Priya Sharma (8th) - Test scores dropped by 25% (72% to 47%)"
- Red severity for 30%+ drop, amber for 20-29% drop

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useStudentAlerts.ts` | Core hook that analyzes attendance and test data to generate alerts |
| `src/components/StudentAlertsCard.tsx` | Dashboard card component displaying all active alerts |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Import and render StudentAlertsCard below DailySummaryCard |

### No Database Changes Required
All alert detection runs client-side using already-fetched data (students, attendance, test results, weekly tests). No new tables, no new queries, no new API calls.

---

## Hook: useStudentAlerts

### Data Sources (all already available in Index.tsx)
- `students` -- student list with names and classes
- `attendance` -- last 30 days of attendance records (already fetched)
- `weeklyTests` -- test definitions with dates, subjects, max marks
- `testResults` -- student marks for each test

### Consecutive Absence Detection Logic
```text
For each student:
  1. Get all their attendance records, sorted by date (most recent first)
  2. Walk backward from the most recent record
  3. Count consecutive "absent" statuses (per unique date)
  4. If count >= 3, generate an alert
  5. Skip dates where the student had no attendance record
     (they might not have had class that day)
```

### Score Drop Detection Logic
```text
For each student:
  1. Get all their test results, joined with test info
  2. Sort tests by date (newest first)
  3. Take the last 3 tests as "recent" and the 3 before that as "previous"
  4. Calculate average percentage for each group
  5. If recent average is 20%+ lower than previous average, generate alert
  6. Only trigger if student has at least 4 tests total (enough data)
```

### Alert Interface
```typescript
interface StudentAlert {
  id: string;             // unique key for dismissal tracking
  studentId: string;
  studentName: string;
  studentClass: string;
  type: 'consecutive_absence' | 'score_drop';
  severity: 'warning' | 'critical';
  message: string;
  detail: string;         // e.g., "Last present: Jan 22"
  value: number;          // consecutive days or drop percentage
}
```

### Dismissal Tracking
- Uses `sessionStorage` to track dismissed alert IDs
- Alerts reset each new browser session so they aren't permanently hidden
- Individual dismiss button per alert

### Performance
- All computations wrapped in `useMemo` with proper dependencies
- No additional API calls -- reuses existing cached data
- Filters efficiently using Map/Set data structures

---

## Component: StudentAlertsCard

### Layout
```text
+--------------------------------------------------+
| [!] Student Alerts                    3 alerts    |
+--------------------------------------------------+
| [RED]  Ravi Kumar (10th)                          |
|        Absent for 5 consecutive days        [x]   |
|        Last present: Feb 3                        |
+--------------------------------------------------+
| [AMBER] Priya Sharma (8th)                        |
|         Test scores dropped by 25%          [x]   |
|         Recent avg: 47% | Previous avg: 72%       |
+--------------------------------------------------+
| [AMBER] Amit Patel (9th)                          |
|         Absent for 3 consecutive days       [x]   |
|         Last present: Feb 5                        |
+--------------------------------------------------+
```

### Behavior
- Card is collapsible (default expanded if there are alerts)
- Hidden entirely when there are zero alerts
- Each alert row is clickable and opens the StudentDetailsDialog for that student
- Dismiss button (X) removes the alert for the current session
- Sorted by severity (critical first), then by value (highest first)
- Maximum 10 alerts shown, with a "View all" link if more exist
- Respects feature flags: absence alerts need `attendance` enabled, score alerts always shown

### Mobile Optimization
- Full-width card with compact padding
- Touch-friendly dismiss buttons
- Scrollable if many alerts

---

## Integration with Index.tsx

The alerts card will be placed between the DailySummaryCard and ManagementCards, giving it prominent visibility without overwhelming the dashboard:

```text
[Subscription Expiry Alert]
[Birthday Banner]
[Tuition Branding + Actions]
[Daily Summary Card]       <-- existing
[Student Alerts Card]      <-- NEW
[Management Cards]         <-- existing
```

The hook will consume the same data already loaded by `useSupabaseData()`, so there is zero additional network overhead.
