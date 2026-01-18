'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDemoMode, setDemoMode as setDemoModeStorage } from '@/lib/auth';

export function useDemo() {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check initial state on mount
    setIsDemoMode(getDemoMode());

    // Listen for storage changes (for cross-tab sync)
    function handleStorageChange(e) {
      if (e.key === 'chiribudget_demoMode') {
        setIsDemoMode(e.newValue === 'true');
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setDemoMode = useCallback((value) => {
    setDemoModeStorage(value);
    setIsDemoMode(value);
  }, []);

  const enterDemo = useCallback(() => {
    setDemoMode(true);
  }, [setDemoMode]);

  const exitDemo = useCallback(() => {
    setDemoMode(false);
  }, [setDemoMode]);

  return {
    isDemoMode,
    setDemoMode,
    enterDemo,
    exitDemo,
  };
}
