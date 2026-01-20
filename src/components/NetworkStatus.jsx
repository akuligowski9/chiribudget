'use client';

import { WifiOff, RefreshCw, AlertCircle, CloudOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useOffline } from '@/contexts/OfflineContext';
import { useDemo } from '@/hooks/useDemo';
import { cn } from '@/lib/utils';

export default function NetworkStatus() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { isOffline, isOnline, isSyncing, pendingCount, syncError, syncNow } =
    useOffline();

  // Don't show anything in demo mode
  if (isDemoMode) {
    return null;
  }

  // Don't show if online and nothing pending
  if (isOnline && !isSyncing && pendingCount === 0 && !syncError) {
    return null;
  }

  return (
    <div
      className={cn(
        'mx-4 mb-2 rounded-xl px-3 py-2 text-sm transition-all duration-200',
        isOffline
          ? 'bg-gradient-to-r from-warning/20 to-warning/10 border border-warning/30 text-warning'
          : syncError
            ? 'bg-gradient-to-r from-error/20 to-error/10 border border-error/30 text-error'
            : 'bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 text-slate'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isOffline ? (
            <>
              <WifiOff className="w-4 h-4" aria-hidden="true" />
              <span>{t('offline.offlineMode') || 'Offline mode'}</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>{t('offline.syncing') || 'Syncing...'}</span>
            </>
          ) : syncError ? (
            <>
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span>{t('offline.syncFailed') || 'Sync failed'}</span>
            </>
          ) : (
            <>
              <CloudOff className="w-4 h-4" aria-hidden="true" />
              <span>
                {pendingCount === 1
                  ? t('offline.pendingSingular') || '1 pending'
                  : (t('offline.pendingPlural') || '{count} pending').replace(
                      '{count}',
                      pendingCount
                    )}
              </span>
            </>
          )}
        </div>

        {/* Sync button - only show when online with pending items or error */}
        {isOnline && (pendingCount > 0 || syncError) && !isSyncing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={syncNow}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" aria-hidden="true" />
            {t('offline.syncNow') || 'Sync now'}
          </Button>
        )}
      </div>

      {/* Additional message when offline */}
      {isOffline && pendingCount > 0 && (
        <div className="mt-1 text-xs opacity-80">
          {pendingCount === 1
            ? t('offline.willSyncSingular') ||
              '1 change will sync when back online'
            : (
                t('offline.willSyncPlural') ||
                '{count} changes will sync when back online'
              ).replace('{count}', pendingCount)}
        </div>
      )}
    </div>
  );
}
