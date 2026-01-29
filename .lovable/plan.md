
# Quick Daily Summary Dashboard

## Overview
Create a comprehensive "Today at a Glance" dashboard card that gives tuition admins an immediate snapshot of what's happening today and what needs attention, placed prominently at the top of the Index page.

## What You'll See

The dashboard will show 4 key sections in a compact, mobile-friendly card:

### 1. Today's Classes Status
- Total classes scheduled for today
- Classes where attendance is marked vs pending
- Visual progress indicator
- Quick link to Attendance page

### 2. Attendance Snapshot
- Students marked present today (across all classes)
- Absent count with alert styling if high
- Overall attendance rate for the day

### 3. Fee Collection Today
- Amount collected today (payments made today)
- Fees due this week (next 7 days)
- Count of overdue fees requiring attention

### 4. Upcoming Tests This Week
- Tests scheduled in the next 7 days
- Quick preview showing subject and class

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/DailySummaryCard.tsx` | Main summary card component with 4 sections |
| `src/hooks/useDailySummary.ts` | Hook to compute today's statistics efficiently |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Import and render DailySummaryCard above ManagementCards |
| `src/hooks/queries/useFeesQuery.ts` | Add `useTodayPaymentsQuery` for today's collections |

---

## Component Design

### DailySummaryCard Layout
```text
+------------------------------------------+
|  Today at a Glance         Jan 29, 2026  |
+------------------------------------------+
|  [Classes]    |  [Attendance]            |
|  3/5 marked   |  42 present | 8 absent   |
|  ████░░ 60%   |  84% attendance          |
+------------------------------------------+
|  [Fees]       |  [Tests This Week]       |
|  ₹12,500 today|  3 tests upcoming        |
|  5 due soon   |  • Math 10th (Jan 30)    |
+------------------------------------------+
```

### Mobile Optimization
- 2x2 grid on mobile (each section ~50% width)
- Compact text sizes with clear icons
- Tappable sections navigate to respective pages

---

## Data Sources

### Today's Classes (from existing timetable data)
```typescript
// Filter timetable for today's day of week + special classes for today
const todayClasses = timetable.filter(entry => 
  (entry.type === 'regular' && entry.dayOfWeek === today.getDay()) ||
  (entry.type === 'special' && entry.specificDate === todayStr)
);
```

### Attendance Status (from existing attendance data)
```typescript
// Get unique student attendance for today
const todayAttendance = attendance.filter(a => a.date === todayStr);
const presentCount = new Set(todayAttendance.filter(a => a.status === 'present').map(a => a.studentId)).size;
const absentCount = new Set(todayAttendance.filter(a => a.status === 'absent').map(a => a.studentId)).size;

// Classes with attendance marked
const classesWithAttendance = new Set(todayAttendance.map(a => `${a.subjectId}-${a.facultyId}`));
```

### Fee Collections (new optimized query)
```typescript
// Payments made today (from fee_payments table)
const todayPayments = await supabase
  .from('fee_payments')
  .select('amount')
  .eq('payment_date', todayStr);

// Fees due in next 7 days
const feesDueSoon = fees.filter(f => 
  f.status !== 'paid' && 
  new Date(f.dueDate) <= sevenDaysFromNow
);
```

### Upcoming Tests (from existing weeklyTests data)
```typescript
const upcomingTests = weeklyTests.filter(t => {
  const testDate = new Date(t.date);
  return testDate >= today && testDate <= sevenDaysFromNow;
}).slice(0, 3);
```

---

## Hook: useDailySummary

```typescript
interface DailySummary {
  // Classes
  totalClassesToday: number;
  classesWithAttendance: number;
  attendanceProgress: number;
  
  // Attendance
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  
  // Fees
  collectedToday: number;
  feesDueSoon: number;
  overdueCount: number;
  
  // Tests
  upcomingTests: Array<{ name: string; subject: string; class: string; date: string }>;
}
```

---

## Feature Gating

The summary card will respect existing feature flags:
- Attendance section: Only shown if `attendance` feature enabled
- Fees section: Only shown if `fees` feature enabled
- Tests section: Always shown (core feature)
- Classes section: Only shown if `timetable` feature enabled

---

## Performance Considerations

1. **No New API Calls for Core Data**
   - Reuses existing `useSupabaseData` hook data
   - Only adds one small query for today's payments

2. **Memoized Computations**
   - All statistics computed with `useMemo`
   - Only recalculates when underlying data changes

3. **Efficient Date Filtering**
   - Uses simple string comparison for date matching
   - Filters client-side from already-cached data

---

## Navigation Integration

Each section is clickable and navigates to the relevant page:
- Classes section: `/attendance` (to mark pending attendance)
- Attendance section: `/attendance`
- Fees section: `/fees`
- Tests section: `/tests`

---

## Visual Design

- Clean white card matching existing design system
- Color-coded indicators:
  - Green: Good (high attendance, fees paid)
  - Yellow: Attention needed (pending items)
  - Red: Urgent (overdue fees, high absence)
- Consistent with existing `ManagementCards` styling
- Icons from lucide-react for visual recognition
