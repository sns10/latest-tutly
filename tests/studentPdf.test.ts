import { describe, expect, test } from 'bun:test';
import { inflateSync } from 'node:zlib';
import { createStudentPdf, studentPdfValue } from '../src/lib/studentPdf';
import type { Student } from '../src/types';

const student: Student = {
  id: 'student-1', name: 'Export Test Student', class: '10th', avatar: '',
  fatherPhone: '9876543210', email: 'private@example.test',
  xp: { blackout: 0, futureMe: 0, recallWar: 0 }, totalXp: 0,
  purchasedRewards: [], team: null, badges: [],
};

describe('student PDF selection', () => {
  test('only selected columns enter the PDF', async () => {
    const blob = createStudentPdf([student], ['name', 'fatherPhone'], 'Test Center', '10th class');
    const source = Buffer.from(await blob.arrayBuffer()).toString('latin1');
    const text = [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
      try { return inflateSync(Buffer.from(match[1], 'latin1')).toString(); }
      catch { return match[1]; }
    }).join('\n');
    expect(text).toContain('Export Test Student');
    expect(text).toContain('9876543210');
    expect(text).not.toContain('private@example.test');
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1000);
    expect(studentPdfValue(student, 'fatherPhone')).toBe('9876543210');
    expect(studentPdfValue(student, 'division')).toBe('-');
  });
  test('requires at least one column', () => {
    expect(() => createStudentPdf([student], [], 'Test Center', 'All')).toThrow();
  });
});