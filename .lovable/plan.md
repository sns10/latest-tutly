## Goal

In Tomorrow's Schedule, treat each (class, division) as its own group with its own Copy / Share-to-WhatsApp button, so 10th-A and 10th-B can be sent separately.

## Scope

Single file: `src/components/scheduling/TomorrowSchedule.tsx`. No DB changes — `division_id` already exists on `timetable` and the Add/Edit dialogs already capture it.

## Changes

1. **Group by class + division** in `tomorrowClasses`:
   - Key becomes `${className}__${divisionId ?? 'all'}`.
   - Entries with no `divisionId` form an "All Divisions" group (shown only when that class has no division-specific entries, OR always shown if the class has a mix — keep it simple: bucket strictly by the entry's own `divisionId`, "All" bucket renders when entries truly have null divisionId).
   - Sort groups by class then division name.

2. **Card header per group**:
   - Title: `Class 10th — Division A` (or `Class 10th — All Divisions` when no division set).
   - Keep existing Copy + Share-to-WhatsApp buttons, now scoped to that division's entries.

3. **WhatsApp message** (`generateWhatsAppMessage`):
   - Accept the group key (or `{className, divisionId}`) instead of just className.
   - Header line becomes `🎓 *Class {className} — Division {divisionName}*` (omit division line when null).
   - Body unchanged.

4. **Add Class for Tomorrow** button per group:
   - Pre-fills both `selectedClassForAdd` and a new `selectedDivisionForAdd` state.
   - Pass `divisionId` through `onAddEntry` (currently passes `undefined` at position 13 — replace with the group's division).
   - Add dialog: show division as read-only label (since it's pre-selected from the card).

5. **Edit dialog** already forwards `editingEntry.divisionId` — no change needed.

6. **Empty state**: keep the existing "No classes scheduled for tomorrow" when no groups exist. No global "Add" needed; users add via Schedule Class dialog or the per-group button.

## Out of scope

- Weekly / Special / Timeline tabs (Weekly already has division chips).
- Subject/faculty-per-division mapping.
- Any DB migration.

## Verification

- 10th class with divisions A and B and entries in both → two separate cards, each with its own Share button producing a message limited to that division.
- 8th class with no divisions defined → single "All Divisions" card as today.
- Add Class for Tomorrow from the "10th — A" card creates a special class with `division_id = A`.
