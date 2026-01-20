'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getDemoMode } from '@/lib/auth';
import {
  initOfflineStore,
  getPendingSyncCount,
  getConflicts,
  addOfflineTransaction,
  updateOfflineTransaction,
  deleteOfflineTransaction,
  getOfflineTransactions,
  clearOfflineStore,
} from '@/lib/offlineStore';
import {
  processSync,
  addSyncListener,
  scheduleSync,
  isSyncInProgress,
} from '@/lib/syncQueue';

const OfflineContext = createContext(null);

// Sync interval in milliseconds (5 minutes)
const SYNC_INTERVAL = 5 * 60 * 1000;

export function OfflineProvider({ children }) {
  const { isOnline, isOffline, wasOffline, clearWasOffline } =
    useNetworkStatus();
  const { profile, household: _household } = useAuth();

  const [pendingCount, setPendingCount] = useState(0);
  const [conflicts, setConflicts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const syncIntervalRef = useRef(null);

  // Define useCallback hooks BEFORE useEffects that depend on them
  const refreshPendingCount = useCallback(async () => {
    if (getDemoMode()) return;
    const count = await getPendingSyncCount();
    setPendingCount(count);
  }, []);

  const refreshConflicts = useCallback(async () => {
    if (getDemoMode()) return;
    const conflictList = await getConflicts();
    setConflicts(conflictList);
  }, []);

  const syncNow = useCallback(async () => {
    if (getDemoMode() || !isOnline || isSyncInProgress()) {
      return;
    }

    await processSync();
    await refreshPendingCount();
    await refreshConflicts();
  }, [isOnline, refreshPendingCount, refreshConflicts]);

  // Initialize offline store when household is available
  useEffect(() => {
    // Skip in demo mode
    if (getDemoMode()) {
      return;
    }

    if (profile?.household_id) {
      initOfflineStore(profile.household_id).then(() => {
        setIsInitialized(true);
        refreshPendingCount();
        refreshConflicts();
      });
    }

    return () => {
      // Cleanup on unmount
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [profile?.household_id, refreshPendingCount, refreshConflicts]);

  // Listen for sync events
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = addSyncListener((event) => {
      switch (event.type) {
        case 'start':
          setIsSyncing(true);
          setSyncError(null);
          break;
        case 'complete':
          setIsSyncing(false);
          setLastSyncAt(new Date().toISOString());
          refreshPendingCount();
          refreshConflicts();
          break;
        case 'conflict':
          refreshConflicts();
          break;
        case 'error':
          setSyncError(event.error);
          break;
        case 'max_attempts':
          setSyncError(`Failed to sync after ${event.attempts} attempts`);
          break;
      }
    });

    return unsubscribe;
  }, [isInitialized, refreshPendingCount, refreshConflicts]);

  // Trigger sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && isInitialized && !getDemoMode()) {
      clearWasOffline();
      syncNow();
    }
  }, [isOnline, wasOffline, isInitialized, clearWasOffline, syncNow]);

  // Set up periodic sync
  useEffect(() => {
    if (!isInitialized || getDemoMode()) return;

    syncIntervalRef.current = setInterval(() => {
      if (isOnline && pendingCount > 0) {
        syncNow();
      }
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isInitialized, isOnline, pendingCount, syncNow]);

  // Trigger sync on visibility change (when app comes to foreground)
  useEffect(() => {
    if (!isInitialized || getDemoMode()) return;

    function handleVisibilityChange() {
      if (
        document.visibilityState === 'visible' &&
        isOnline &&
        pendingCount > 0
      ) {
        syncNow();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInitialized, isOnline, pendingCount, syncNow]);

  // Wrapper for adding transactions that handles offline state
  const addTransaction = useCallback(
    async (transaction) => {
      if (getDemoMode()) {
        throw new Error('Cannot use offline store in demo mode');
      }

      const id = await addOfflineTransaction(transaction);
      await refreshPendingCount();

      // Schedule sync if online
      if (isOnline) {
        scheduleSync();
      }

      return id;
    },
    [isOnline, refreshPendingCount]
  );

  // Wrapper for updating transactions
  const updateTransaction = useCallback(
    async (id, updates) => {
      if (getDemoMode()) {
        throw new Error('Cannot use offline store in demo mode');
      }

      await updateOfflineTransaction(id, updates);
      await refreshPendingCount();

      if (isOnline) {
        scheduleSync();
      }
    },
    [isOnline, refreshPendingCount]
  );

  // Wrapper for deleting transactions
  const deleteTransaction = useCallback(
    async (id) => {
      if (getDemoMode()) {
        throw new Error('Cannot use offline store in demo mode');
      }

      await deleteOfflineTransaction(id);
      await refreshPendingCount();

      if (isOnline) {
        scheduleSync();
      }
    },
    [isOnline, refreshPendingCount]
  );

  // Get offline transactions for a month/currency
  const getOfflineTxns = useCallback(async ({ month, currency }) => {
    if (getDemoMode()) return [];
    return getOfflineTransactions({ month, currency });
  }, []);

  // Clear all offline data (for logout)
  const clearOfflineData = useCallback(async () => {
    await clearOfflineStore();
    setPendingCount(0);
    setConflicts([]);
    setIsInitialized(false);
  }, []);

  const value = {
    // Network status
    isOnline,
    isOffline,

    // Sync status
    isSyncing,
    pendingCount,
    lastSyncAt,
    syncError,
    conflicts,

    // Actions
    syncNow,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getOfflineTxns,
    clearOfflineData,
    refreshPendingCount,

    // State
    isInitialized,
  };

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
