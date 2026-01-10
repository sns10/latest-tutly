import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserTuition } from './useUserTuition';

interface MarksDraft {
  marks: { [studentId: string]: number };
  updatedAt: string;
}

interface TermExamMarksDraft {
  marks: { [studentId: string]: number };
  selectedSubjectId: string;
  selectedDivision: string;
  updatedAt: string;
}

const DRAFT_DEBOUNCE_MS = 500;

export function useWeeklyTestMarksDraft(testId: string) {
  const { tuitionId } = useUserTuition();
  const draftKey = `marks_draft_weekly_${tuitionId}_${testId}`;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getDraft = useCallback((): MarksDraft | null => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading marks draft:', e);
    }
    return null;
  }, [draftKey]);

  const saveDraft = useCallback((marks: { [studentId: string]: number }) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      try {
        // Clear draft if marks is empty
        if (Object.keys(marks).length === 0) {
          localStorage.removeItem(draftKey);
          return;
        }
        const draft: MarksDraft = {
          marks,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (e) {
        console.error('Error saving marks draft:', e);
      }
    }, DRAFT_DEBOUNCE_MS);
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {
      console.error('Error clearing marks draft:', e);
    }
  }, [draftKey]);

  const hasDraft = useCallback((): boolean => {
    const draft = getDraft();
    return draft !== null && Object.keys(draft.marks).length > 0;
  }, [getDraft]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { getDraft, saveDraft, clearDraft, hasDraft };
}

// Per-subject draft storage for term exams to prevent subject mix-up
export function useTermExamMarksDraft(termExamId: string, subjectId?: string, divisionId?: string) {
  const { tuitionId } = useUserTuition();
  // Include subjectId in the key if provided for per-subject drafts
  const subjectKey = subjectId || 'all';
  const divisionKey = divisionId || 'all';
  const draftKey = `marks_draft_term_${tuitionId}_${termExamId}_${subjectKey}_${divisionKey}`;
  // Legacy key for migration
  const legacyDraftKey = `marks_draft_term_${tuitionId}_${termExamId}`;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getDraft = useCallback((): TermExamMarksDraft | null => {
    try {
      // First try the new per-subject key
      let stored = localStorage.getItem(draftKey);
      if (stored) {
        return JSON.parse(stored);
      }
      // Fall back to legacy key for migration
      stored = localStorage.getItem(legacyDraftKey);
      if (stored) {
        const legacyDraft = JSON.parse(stored);
        // Only return if it matches current subject/division context (or if no subject specified)
        if (!subjectId || legacyDraft.selectedSubjectId === subjectId) {
          return legacyDraft;
        }
      }
    } catch (e) {
      console.error('Error reading term exam marks draft:', e);
    }
    return null;
  }, [draftKey, legacyDraftKey, subjectId]);

  const saveDraft = useCallback((
    marks: { [studentId: string]: number },
    selectedSubjectId: string,
    selectedDivision: string
  ) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      try {
        // Clear draft if marks is empty
        if (Object.keys(marks).length === 0) {
          localStorage.removeItem(draftKey);
          // Also clear legacy key if it matches
          try {
            const legacy = localStorage.getItem(legacyDraftKey);
            if (legacy) {
              const parsed = JSON.parse(legacy);
              if (parsed.selectedSubjectId === selectedSubjectId) {
                localStorage.removeItem(legacyDraftKey);
              }
            }
          } catch (e) { /* ignore */ }
          return;
        }
        const draft: TermExamMarksDraft = {
          marks,
          selectedSubjectId,
          selectedDivision,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (e) {
        console.error('Error saving term exam marks draft:', e);
      }
    }, DRAFT_DEBOUNCE_MS);
  }, [draftKey, legacyDraftKey]);

  const clearDraft = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      localStorage.removeItem(draftKey);
      // Also clear legacy key
      localStorage.removeItem(legacyDraftKey);
    } catch (e) {
      console.error('Error clearing term exam marks draft:', e);
    }
  }, [draftKey, legacyDraftKey]);

  const hasDraft = useCallback((): boolean => {
    const draft = getDraft();
    return draft !== null && Object.keys(draft.marks).length > 0;
  }, [getDraft]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { getDraft, saveDraft, clearDraft, hasDraft };
}
