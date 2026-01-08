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
        if (Object.keys(marks).length > 0) {
          const draft: MarksDraft = {
            marks,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(draftKey, JSON.stringify(draft));
        }
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

export function useTermExamMarksDraft(termExamId: string) {
  const { tuitionId } = useUserTuition();
  const draftKey = `marks_draft_term_${tuitionId}_${termExamId}`;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getDraft = useCallback((): TermExamMarksDraft | null => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading term exam marks draft:', e);
    }
    return null;
  }, [draftKey]);

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
        if (Object.keys(marks).length > 0) {
          const draft: TermExamMarksDraft = {
            marks,
            selectedSubjectId,
            selectedDivision,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(draftKey, JSON.stringify(draft));
        }
      } catch (e) {
        console.error('Error saving term exam marks draft:', e);
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
      console.error('Error clearing term exam marks draft:', e);
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
