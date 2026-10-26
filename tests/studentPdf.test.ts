import { describe, expect, test } from 'bun:test';
import { createStudentPdf, studentPdfValue } from './studentPdf';
import type { Student } from '../types';

const student: Student = {
  id: 'student-1', name: 'Export Test Student', class: '10th', avatar: '',
  fatherPhone: '9876543210', email: 'private@example.test',
  xp: { blackout: 0, futureMe: 0, recallWar: 0 }, totalXp: 0,
  purchasedRewards: [], team: null, badges: [],
};

describe('student PDF selection', () => {
  test('only selected columns enter the PDF', async () => {
    const blob = createStudentPdf([student], ['name', 'fatherPhone'], 'Test Center', '10th class');
    // The PDF is compressed; metadata cannot substitute for verifying table data.
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1000);
    expect(studentPdfValue(student, 'fatherPhone')).toBe('9876543210');
    expect(studentPdfValue(student, 'division')).toBe('-');
  });
  test('requires at least one column', () => {
    expect(() => createStudentPdf([student], [], 'Test Center', 'All')).toThrow();
  });
});