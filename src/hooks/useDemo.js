'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDemoMode, setDemoMode as setDemoModeStorage } from '@/lib/auth';

export function useDemo() {
  // Initialize with actual localStorage value (works client-side)
  const [isDemoMode, setIsDemoMode] = useState(() => getDemoMode());

  useEffect(() => {
    // Re-check on mount in case of SSR mismatch
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
    // Set English as default language for demo mode
    localStorage.setItem('chiribudget_language', 'en');
    // Reload to apply demo mode across the app
    window.location.reload();
  }, [setDemoMode]);

  const exitDemo = useCallback(() => {
    setDemoMode(false);
    // Reload to exit demo mode and show login screen
    window.location.reload();
  }, [setDemoMode]);

  return {
    isDemoMode,
    setDemoMode,
    enterDemo,
    exitDemo,
  };
}
