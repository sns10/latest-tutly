# Fix: Site Freezes After PDF Download / WhatsApp Reminder

## Root Cause

Two distinct bugs combine to lock the UI after the user clicks **PDF**, **Print**, or **WhatsApp** inside the Fee Receipt / WhatsApp Reminder dialogs.

### Bug 1: Radix Dialog leaves `pointer-events: none` on `<body>`

Radix UI's Dialog (used by `FeeReceipt`, `WhatsAppReminderDialog`, `PaymentHistoryDialog`, `RecordPaymentDialog`) sets `style="pointer-events: none"` on `<body>` while open. When the user clicks the WhatsApp / PDF / Print button:

- `window.open(...)` (WhatsApp share, Print iframe) immediately moves focus away from the page.
- iOS/Android Safari does **not** fire the dialog's `onOpenChange(false)` cleanup reliably when focus is stolen mid-gesture.
- The body keeps `pointer-events: none` → **every click on the page is dead**, even though it visually looks normal. This is exactly the "stuck, can't click anything" symptom the user reported. It is a well-documented Radix issue (#1241).

### Bug 2: html2canvas blocks the main thread for 5–15 s on mobile

`handleDownloadPDF` in `src/components/fees/FeeReceipt.tsx` calls `html2canvas(receiptElement, { scale: 2 })` synchronously on the visible receipt **inside an open dialog**. On a mid-range phone this freezes the UI for many seconds. If the user taps anything during that freeze, the gesture is queued and fires after html2canvas finishes — sometimes after the dialog has been closed by user, leaving stale state.

### Bug 3: Print iframe never gets cleaned up if `onload` doesn't fire

In `handlePrint`, the cleanup `setTimeout` only runs **inside** the `onload` handler. On iOS Safari, `iframe.onload` for a `document.write`'d iframe sometimes never fires → the hidden iframe lingers in DOM forever, holding focus and blocking interactions.

## Changes

### 1. `src/components/fees/FeeReceipt.tsx`
- **Wrap heavy operations in `requestAnimationFrame` + `setTimeout(0)`** so the click handler returns immediately and the loading toast actually paints before html2canvas blocks the thread.
- **Always clean up the print iframe** with a guaranteed `setTimeout` outside the `onload` path (5 s safety net) and remove the duplicate inline trigger.
- **Force-restore `document.body.style.pointerEvents = ''`** in a `finally` block after `handleDownloadPDF`, `handlePrint`, and `handleWhatsAppShare` complete, as a safety net against the Radix bug.
- **Close the receipt dialog before opening WhatsApp**: call `onOpenChange(false)` first, then `window.open` in a `setTimeout(0)` so Radix can finish its cleanup.

### 2. `src/components/fees/WhatsAppReminderDialog.tsx`
- Close dialog **before** `window.open` (currently closes after, which is when the freeze happens).
- Add `document.body.style.pointerEvents = ''` safety reset after the open.

### 3. `src/components/BirthdayWhatsAppDialog.tsx` and `src/components/attendance/WhatsAppMessageDialog.tsx`
- Same fix: close dialog → next tick → `window.open` → restore body pointer-events. Same bug class.

### 4. New helper `src/lib/dialogSafety.ts`
- Tiny utility `safelyOpenExternal(url: string, closeDialog?: () => void)` that:
  1. Calls `closeDialog?.()`
  2. `requestAnimationFrame(() => { window.open(url, '_blank'); document.body.style.pointerEvents = ''; })`
- Reuse from all 4 call sites above to keep the pattern consistent.

### 5. (Optional safety) `src/App.tsx` or `src/bootstrap.ts`
- Add a global `visibilitychange` listener that resets `document.body.style.pointerEvents = ''` when the tab becomes visible again. This catches any future regression where a dialog's cleanup is interrupted by an external app switch (WhatsApp, share sheet, etc.).

## What stays untouched
- Receipt rendering / template HTML (works fine — the rendering isn't the bug).
- `FeesList`, `useFeesQuery`, mutations — no data-layer changes needed.
- Birthday card PDF generator (uses same html2canvas pattern but runs in its own dialog without follow-up `window.open`, so not affected by the same trap; we'll keep eyes on it but no change needed).

## Risk
- Low. All changes are defensive (close dialog earlier, restore body style, deferred external opens). No API or data changes.
- The `body.pointerEvents` reset is a documented workaround used by hundreds of Radix consumers.

## Expected Result
After this fix, on every device:
- Clicking **PDF** → loading toast appears immediately, receipt downloads, page stays interactive.
- Clicking **WhatsApp** / **Print** → dialog closes, WhatsApp opens in new tab, returning to the app the page is **fully clickable**.
- The `visibilitychange` safety net catches any future regression invisibly.
