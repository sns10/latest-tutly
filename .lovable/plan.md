## Mobile attendance name visibility fix

### Problem
In the mobile attendance view, each student row renders the name and the P/A/L/E action buttons on a single horizontal line. Because the buttons are large touch targets (40px each) and the font stays at `text-sm`, the name column is truncated and teachers can't read full student names, leading to confusion when marking attendance.

### What we'll change
Only one component: `src/components/attendance/VirtualizedStudentList.tsx`.

1. **Responsive row layout**  
   Change the row from a single horizontal flex to a stacked vertical layout on mobile and keep the existing horizontal layout on `sm` and up:
   - Mobile: avatar + name on one full-width line; P/A/L/E buttons on a second full-width line below.
   - Desktop/tablet: unchanged single-row layout.

2. **Smaller name font on mobile**  
   Use `text-xs` on small screens and `text-sm` on `sm` and up, so longer names fit without truncation.

3. **Preserve virtualizer behavior**  
   The `@tanstack/react-virtual` setup already uses `measureElement`, so the row height will automatically adapt from the mobile stacked height to the desktop compact height. No hard-coded height changes are required.

4. **No touch-target reduction**  
   Buttons remain `h-10 min-w-[40px]` so they stay easy to tap on mobile.

### What we won't touch
- No backend, database, or RPC changes.
- No attendance saving logic, optimistic updates, or mutation behavior.
- No desktop/tablet layout changes above the `sm` breakpoint.
- No other components besides `VirtualizedStudentList.tsx`.

### Validation
After the change, verify the preview in a mobile viewport: each student row should show the full name on its own line, buttons should be clearly tappable below, and the desktop layout should remain identical to before.