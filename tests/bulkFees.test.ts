import { test, expect } from 'bun:test';
import { monthRange, validateBulkPayments, chunk } from '../src/lib/bulkFees';

test('month range spans year boundary inclusively', () => {
  expect(monthRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
});

test('month range accepts reversed order', () => {
  expect(monthRange('2026-08', '2026-06')).toEqual(['2026-06', '2026-07', '2026-08']);
});

test('month range is capped at 24 months', () => {
  expect(monthRange('2020-01', '2026-01').length).toBe(24);
});

test('bulk payment rejects amount above remaining due', () => {
  const { valid, invalid } = validateBulkPayments([
    { feeId: 'a', remaining: 500, amount: 500 },
    { feeId: 'b', remaining: 500, amount: 600 },
    { feeId: 'c', remaining: 500, amount: 0 },
  ]);
  expect(valid.map(v => v.feeId)).toEqual(['a']);
  expect(invalid.map(v => v.feeId)).toEqual(['b']);
});

test('chunks into batches of given size', () => {
  expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
});
