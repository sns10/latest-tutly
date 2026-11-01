import { describe, expect, test } from 'bun:test';
import { reportPeriod, riskFor } from '../src/lib/outstandingReport';

describe('outstanding fee report rules', () => {
  test('choosing October with a June year start covers June 1 to October 31', () => {
    expect(reportPeriod('2026-10', 6)).toEqual({ from: '2026-06-01', to: '2026-10-31' });
  });
  test('choosing February rolls back to the previous year start', () => {
    expect(reportPeriod('2027-02', 6)).toEqual({ from: '2026-06-01', to: '2027-02-28' });
  });
  test('3 or more missed months is High risk', () => {
    expect(riskFor(3)).toBe('High');
    expect(riskFor(2)).toBe('Medium');
    expect(riskFor(1)).toBe('Low');
  });
});
