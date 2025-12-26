import { useState, useCallback } from 'react';

const LOGIN_ATTEMPTS_KEY = 'login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface LoginAttempts {
  count: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

export function useLoginRateLimit() {
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const stored = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (stored) {
      const data: LoginAttempts = JSON.parse(stored);
      if (data.lockedUntil && Date.now() < data.lockedUntil) {
        return true;
      }
    }
    return false;
  });

  const [remainingAttempts, setRemainingAttempts] = useState<number>(() => {
    const stored = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (stored) {
      const data: LoginAttempts = JSON.parse(stored);
      // Reset if lockout has expired
      if (data.lockedUntil && Date.now() >= data.lockedUntil) {
        return MAX_ATTEMPTS;
      }
      return Math.max(0, MAX_ATTEMPTS - data.count);
    }
    return MAX_ATTEMPTS;
  });

  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(() => {
    const stored = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (stored) {
      const data: LoginAttempts = JSON.parse(stored);
      if (data.lockedUntil && Date.now() < data.lockedUntil) {
        return data.lockedUntil;
      }
    }
    return null;
  });

  const recordFailedAttempt = useCallback(() => {
    const stored = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    let data: LoginAttempts = stored 
      ? JSON.parse(stored) 
      : { count: 0, lastAttempt: 0, lockedUntil: null };

    // Reset if lockout has expired or if last attempt was long ago
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
      data = { count: 0, lastAttempt: 0, lockedUntil: null };
    }

    data.count++;
    data.lastAttempt = Date.now();

    if (data.count >= MAX_ATTEMPTS) {
      data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      setIsLocked(true);
      setLockoutEndTime(data.lockedUntil);
    }

    setRemainingAttempts(Math.max(0, MAX_ATTEMPTS - data.count));
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
  }, []);

  const recordSuccessfulLogin = useCallback(() => {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    setIsLocked(false);
    setRemainingAttempts(MAX_ATTEMPTS);
    setLockoutEndTime(null);
  }, []);

  const checkAndResetLockout = useCallback(() => {
    const stored = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (stored) {
      const data: LoginAttempts = JSON.parse(stored);
      if (data.lockedUntil && Date.now() >= data.lockedUntil) {
        localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
        setIsLocked(false);
        setRemainingAttempts(MAX_ATTEMPTS);
        setLockoutEndTime(null);
        return true;
      }
    }
    return !isLocked;
  }, [isLocked]);

  const getLockoutTimeRemaining = useCallback(() => {
    if (!lockoutEndTime) return 0;
    return Math.max(0, Math.ceil((lockoutEndTime - Date.now()) / 1000));
  }, [lockoutEndTime]);

  return {
    isLocked,
    remainingAttempts,
    lockoutEndTime,
    recordFailedAttempt,
    recordSuccessfulLogin,
    checkAndResetLockout,
    getLockoutTimeRemaining
  };
}
