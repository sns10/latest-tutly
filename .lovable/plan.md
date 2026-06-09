
## Problem

After clicking **Print** in the Fee Receipt dialog and closing the browser's print preview, the page becomes unresponsive (scrolls but clicks don't register). Same root cause family as before: a stuck `body { pointer-events: none }` left by Radix Dialog when the print dialog steals focus mid-lifecycle.

## What I'll change

**`src/components/fees/FeeReceipt.tsx` — `handlePrint`**

1. Listen for the iframe's `afterprint` event and the parent window's `focus` event, and call `restoreBodyPointerEvents()` repeatedly (0ms, 200ms, 600ms) when either fires — this covers the moment the user dismisses the system print dialog.
2. Close the receipt dialog itself (`onOpenChange(false)`) right after triggering print, so Radix can finish unmounting cleanly while the print preview is on screen. The receipt remains accessible from the row menu / payment history if needed again.
3. Keep the existing 5-second iframe cleanup as a safety net, and add a final `restoreBodyPointerEvents()` burst there too.
4. Also add a `setTimeout(restoreBodyPointerEvents, 1000)` right after print is triggered as a hard fallback for browsers that don't fire `afterprint` reliably.

**`src/components/fees/FeesList.tsx` — receipt dialog close handler**

- Confirm `closeReceiptDialog` already calls `unlockBody()`; if not, add a multi-tick `restoreBodyPointerEvents` burst (0/100/400ms) to handle the post-print path.

## Expected result

After printing a receipt:
- The print dialog opens normally.
- When the user closes/cancels the print dialog, the page is fully interactive again.
- The 3-dot menu, tabs (Custom Fee, Structure, etc.), and Record Payment all respond immediately.
- No visual change to the receipt layout or print output.

## Files touched

- `src/components/fees/FeeReceipt.tsx`
- `src/components/fees/FeesList.tsx` (only if the receipt close handler needs the extra unlock burst)

If you approve, I'll implement this focused fix now.
