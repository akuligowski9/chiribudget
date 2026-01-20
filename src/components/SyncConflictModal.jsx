'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SyncConflictModal({ open, onClose, onAcceptServer, conflict }) {
  const t = useTranslations();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (!open) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !conflict) return null;

  function handleBackdropClick(e) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  function handleAcceptServer() {
    onAcceptServer(conflict.transactionId);
    onClose();
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
    >
      <div
        className={cn(
          'w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl',
          'border border-white/80 p-6',
          'animate-in zoom-in-95 slide-in-from-bottom-4 duration-200'
        )}
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-warning/20 to-warning/10 text-warning">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h2
              id="conflict-dialog-title"
              className="text-lg font-bold text-charcoal mb-1"
            >
              {t('offline.syncConflict') || 'Sync Conflict'}
            </h2>
            <p className="text-sm text-stone leading-relaxed">
              {t('offline.conflictDescription') ||
                'Your partner updated this transaction while you were offline. Your changes could not be applied.'}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="shrink-0 p-1 rounded-lg hover:bg-charcoal/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-stone" />
          </button>
        </div>

        {/* Show what changed */}
        {conflict.serverData && (
          <div className="mt-4 p-3 rounded-xl bg-sand/30 border border-sand/50 text-sm">
            <div className="font-semibold text-charcoal mb-2">
              {t('offline.currentValue') || 'Current value (from server):'}
            </div>
            <div className="space-y-1 text-stone">
              {conflict.serverData.description && (
                <div>
                  <span className="text-warm-gray">
                    {t('transaction.description') || 'Description'}:
                  </span>{' '}
                  {conflict.serverData.description}
                </div>
              )}
              {conflict.serverData.amount && (
                <div>
                  <span className="text-warm-gray">
                    {t('transaction.amount') || 'Amount'}:
                  </span>{' '}
                  {conflict.serverData.currency}{' '}
                  {Math.abs(conflict.serverData.amount).toFixed(2)}
                </div>
              )}
              {conflict.serverData.category && (
                <div>
                  <span className="text-warm-gray">
                    {t('transaction.category') || 'Category'}:
                  </span>{' '}
                  {conflict.serverData.category}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('common.dismiss') || 'Dismiss'}
          </Button>
          <Button className="flex-1" onClick={handleAcceptServer}>
            {t('offline.acceptServer') || 'Accept server version'}
          </Button>
        </div>
      </div>
    </div>
  );
}
