'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) {
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Focus the confirm button when dialog opens
      confirmButtonRef.current?.focus();
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

  // Prevent body scroll when dialog is open
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

  if (!open) return null;

  function handleBackdropClick(e) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  function handleConfirm() {
    onConfirm();
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
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl',
          'border border-white/80 p-6',
          'animate-in zoom-in-95 slide-in-from-bottom-4 duration-200'
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              variant === 'danger'
                ? 'bg-gradient-to-br from-error/20 to-error/10 text-error'
                : 'bg-gradient-to-br from-warning/20 to-warning/10 text-warning'
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-bold text-charcoal mb-1"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-message"
              className="text-sm text-stone leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={variant === 'danger' ? 'expense' : 'default'}
            className="flex-1"
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
