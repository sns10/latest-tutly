/**
 * Radix Dialog leaves `pointer-events: none` on <body> when its close
 * lifecycle is interrupted by an external navigation (window.open to
 * WhatsApp / share sheets / print). On iOS Safari especially, this leaves
 * the entire page unclickable until a hard refresh.
 *
 * These helpers ensure we always:
 *   1. Close the dialog FIRST so Radix can run cleanup.
 *   2. Defer the external open by one frame so the unmount commits.
 *   3. Restore `body.style.pointerEvents` as a belt-and-braces safety net.
 */

export function restoreBodyPointerEvents() {
  if (typeof document === 'undefined') return;
  // Reset both inline style and any leftover overflow lock.
  document.body.style.pointerEvents = '';
}

/**
 * Open an external URL safely from inside a Radix Dialog.
 * @param url   Destination URL.
 * @param closeDialog Optional callback to close the parent dialog first.
 */
export function safelyOpenExternal(url: string, closeDialog?: () => void) {
  try {
    closeDialog?.();
  } catch {
    /* ignore */
  }

  const open = () => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      // Multiple resets in case Radix re-applies during its unmount animation.
      restoreBodyPointerEvents();
      setTimeout(restoreBodyPointerEvents, 100);
      setTimeout(restoreBodyPointerEvents, 500);
    }
  };

  // Wait one frame so Radix Dialog's onOpenChange unmount can run.
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => setTimeout(open, 0));
  } else {
    setTimeout(open, 50);
  }
}

/**
 * Install a global safety net: any time the tab regains visibility
 * (e.g. user returns from WhatsApp / Print preview / Share sheet),
 * clear any stuck pointer-events lock on <body>.
 */
let installed = false;
export function installDialogSafetyNet() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  const reset = () => {
    if (document.visibilityState === 'visible') {
      restoreBodyPointerEvents();
    }
  };

  try {
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('focus', restoreBodyPointerEvents);
    window.addEventListener('pageshow', restoreBodyPointerEvents);
  } catch {
    /* ignore */
  }
}