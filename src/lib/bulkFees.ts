// Pure helpers for bulk fee generation and bulk payment entry.

/** Inclusive list of YYYY-MM months between from and to (order-independent). Capped at 24. */
export function monthRange(from: string, to: string): string[] {
  let [fy, fm] = from.split('-').map(Number);
  let [ty, tm] = to.split('-').map(Number);
  if (fy * 12 + fm > ty * 12 + tm) [fy, fm, ty, tm] = [ty, tm, fy, fm];
  const out: string[] = [];
  while (fy * 12 + fm <= ty * 12 + tm && out.length < 24) {
    out.push(`${fy}-${String(fm).padStart(2, '0')}`);
    fm += 1;
    if (fm > 12) { fm = 1; fy += 1; }
  }
  return out;
}

export interface BulkPaymentRow {
  feeId: string;
  remaining: number;
  amount: number;
}

/**
 * Validates entered amounts: drops zero/blank, rejects anything above the
 * remaining due so a bulk save can never overpay a fee.
 */
export function validateBulkPayments(rows: BulkPaymentRow[]) {
  const valid: BulkPaymentRow[] = [];
  const invalid: Array<BulkPaymentRow & { reason: string }> = [];
  for (const r of rows) {
    if (!Number.isFinite(r.amount) || r.amount <= 0) continue;
    if (r.amount > r.remaining + 0.001) invalid.push({ ...r, reason: 'More than remaining due' });
    else valid.push(r);
  }
  return { valid, invalid };
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
