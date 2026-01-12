'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, Flag, FlagOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThresholdChangeModal({
  isOpen,
  onClose,
  onConfirm,
  toFlag = [],
  toUnflag = [],
  oldThreshold,
  newThreshold,
  currency,
}) {
  const [selectedToFlag, setSelectedToFlag] = useState(
    new Set(toFlag.map((t) => t.id))
  );
  const [selectedToUnflag, setSelectedToUnflag] = useState(
    new Set(toUnflag.map((t) => t.id))
  );

  if (!isOpen) return null;

  const toggleFlag = (id) => {
    const newSet = new Set(selectedToFlag);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedToFlag(newSet);
  };

  const toggleUnflag = (id) => {
    const newSet = new Set(selectedToUnflag);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedToUnflag(newSet);
  };

  const handleConfirm = () => {
    onConfirm({
      toFlagIds: Array.from(selectedToFlag),
      toUnflagIds: Array.from(selectedToUnflag),
    });
  };

  const hasChanges = toFlag.length > 0 || toUnflag.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-sand/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <CardTitle>Review Threshold Changes</CardTitle>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-sand/50 text-warm-gray hover:text-charcoal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-stone mt-1">
            Threshold changing from {currency} {oldThreshold} to {currency}{' '}
            {newThreshold}
          </p>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto py-4">
          {!hasChanges ? (
            <p className="text-sm text-warm-gray text-center py-4">
              No transactions will be affected by this change.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Transactions to flag */}
              {toFlag.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-warning" />
                      <span className="font-semibold text-charcoal text-sm">
                        Flag transactions ({selectedToFlag.size} of{' '}
                        {toFlag.length})
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedToFlag(new Set(toFlag.map((t) => t.id)))
                        }
                        className="text-slate hover:underline"
                      >
                        All
                      </button>
                      <span className="text-warm-gray">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedToFlag(new Set())}
                        className="text-slate hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-warm-gray mb-2">
                    These are now over the new threshold. Select which to flag.
                  </p>
                  <div className="space-y-2">
                    {toFlag.map((tx) => (
                      <label
                        key={tx.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          selectedToFlag.has(tx.id)
                            ? 'bg-warning/10 border-warning/30'
                            : 'bg-white/50 border-white/60 opacity-60'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedToFlag.has(tx.id)}
                          onChange={() => toggleFlag(tx.id)}
                          className="w-4 h-4 rounded border-warm-gray"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-charcoal truncate">
                            {tx.description || '(no description)'}
                          </div>
                          <div className="text-xs text-warm-gray">
                            {tx.txn_date}
                          </div>
                        </div>
                        <div
                          className={cn(
                            'text-sm font-bold whitespace-nowrap',
                            tx.amount < 0 ? 'text-error' : 'text-success'
                          )}
                        >
                          {tx.amount < 0 ? '-' : '+'}
                          {tx.currency} {Math.abs(tx.amount).toFixed(2)}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions to unflag */}
              {toUnflag.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FlagOff className="w-4 h-4 text-success" />
                      <span className="font-semibold text-charcoal text-sm">
                        Unflag transactions ({selectedToUnflag.size} of{' '}
                        {toUnflag.length})
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedToUnflag(
                            new Set(toUnflag.map((t) => t.id))
                          )
                        }
                        className="text-slate hover:underline"
                      >
                        All
                      </button>
                      <span className="text-warm-gray">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedToUnflag(new Set())}
                        className="text-slate hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-warm-gray mb-2">
                    These are now under the new threshold. Select which to
                    unflag.
                  </p>
                  <div className="space-y-2">
                    {toUnflag.map((tx) => (
                      <label
                        key={tx.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          selectedToUnflag.has(tx.id)
                            ? 'bg-success/10 border-success/30'
                            : 'bg-white/50 border-white/60 opacity-60'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedToUnflag.has(tx.id)}
                          onChange={() => toggleUnflag(tx.id)}
                          className="w-4 h-4 rounded border-warm-gray"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-charcoal truncate">
                            {tx.description || '(no description)'}
                          </div>
                          <div className="text-xs text-warm-gray">
                            {tx.txn_date} &middot; {tx.flag_reason}
                          </div>
                        </div>
                        <div
                          className={cn(
                            'text-sm font-bold whitespace-nowrap',
                            tx.amount < 0 ? 'text-error' : 'text-success'
                          )}
                        >
                          {tx.amount < 0 ? '-' : '+'}
                          {tx.currency} {Math.abs(tx.amount).toFixed(2)}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="border-t border-sand/50 p-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            {hasChanges
              ? `Save & Update ${selectedToFlag.size + selectedToUnflag.size} Transaction${selectedToFlag.size + selectedToUnflag.size !== 1 ? 's' : ''}`
              : 'Save Settings'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
