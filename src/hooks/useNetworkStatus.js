'use client';

import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  // Initialize with true to avoid hydration mismatch
  // (server assumes online, client may be offline)
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set actual status on mount
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      // Track that we came back online (for triggering sync)
      if (!navigator.onLine) {
        setWasOffline(true);
      }
    }

    function handleOffline() {
      setIsOnline(false);
      setWasOffline(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset wasOffline flag after it's been consumed
  const clearWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    clearWasOffline,
  };
}
