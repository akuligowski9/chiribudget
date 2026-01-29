'use client';

import { useState } from 'react';
import { Repeat, Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { toastId } from '@/lib/format';
import { CATEGORY_KEYS } from '@/lib/transactionUtils';
import { cn } from '@/lib/utils';
import RecurringTransactionForm from './RecurringTransactionForm';
import Toast from './Toast';

/**
 * Settings card for managing recurring transactions
 */
export default function RecurringTransactionsSettings() {
  const t = useTranslations();
  const {
    recurring,
    loading,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    getNextOccurrenceDate,
  } = useRecurringTransactions();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleAdd = async (data) => {
    setSubmitting(true);
    const { error } = await addRecurring(data);
    setSubmitting(false);

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('recurring.saveFailed'),
        message: error,
      });
    } else {
      setToast({
        id: toastId(),
        type: 'success',
        title: t('recurring.savedSuccess'),
      });
      setIsAdding(false);
    }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true);
    const { error } = await updateRecurring(editingId, data);
    setSubmitting(false);

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('recurring.saveFailed'),
        message: error,
      });
    } else {
      setToast({
        id: toastId(),
        type: 'success',
        title: t('recurring.savedSuccess'),
      });
      setEditingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    const { error } = await deleteRecurring(confirmDelete);
    setConfirmDelete(null);

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('recurring.deleteFailed'),
        message: error,
      });
    } else {
      setToast({
        id: toastId(),
        type: 'success',
        title: t('recurring.deletedSuccess'),
      });
    }
  };

  const formatAmount = (amount, currency) => {
    const absAmount = Math.abs(Number(amount)).toFixed(2);
    const sign = amount < 0 ? '-' : '+';
    return `${sign}${currency} ${absAmount}`;
  };

  const formatNextDate = (rec) => {
    const nextDate = getNextOccurrenceDate(rec);
    if (!nextDate) return t('recurring.noUpcoming');
    return nextDate;
  };

  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <>
      <CollapsibleCard
        icon={Repeat}
        title={t('recurring.title')}
        description={t('recurring.description')}
        defaultOpen={false}
      >
        <div className="space-y-4">
          {/* Add Button */}
          {!isAdding && !editingId && (
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('recurring.add')}
            </Button>
          )}

          {/* Add Form */}
          {isAdding && (
            <div className="p-4 bg-cream/50 rounded-lg border border-cream">
              <h4 className="font-semibold mb-3">{t('recurring.addNew')}</h4>
              <RecurringTransactionForm
                onSubmit={handleAdd}
                onCancel={() => setIsAdding(false)}
                isSubmitting={submitting}
              />
            </div>
          )}

          {/* Recurring List */}
          {recurring.length === 0 && !isAdding ? (
            <p className="text-sm text-warm-gray text-center py-4">
              {t('recurring.noRecurring')}
            </p>
          ) : (
            <div className="space-y-2">
              {recurring.map((rec) => (
                <div key={rec.id}>
                  {editingId === rec.id ? (
                    <div className="p-4 bg-cream/50 rounded-lg border border-cream">
                      <h4 className="font-semibold mb-3">
                        {t('recurring.edit')}
                      </h4>
                      <RecurringTransactionForm
                        initialData={rec}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingId(null)}
                        isSubmitting={submitting}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-white/40 rounded-lg border border-white/60">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'font-semibold text-sm',
                              rec.amount < 0 ? 'text-error' : 'text-success'
                            )}
                          >
                            {formatAmount(rec.amount, rec.currency)}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-slate/10 rounded-full text-slate">
                            {t(`recurring.frequency.${rec.frequency}`)}
                          </span>
                        </div>
                        <p className="text-sm text-charcoal truncate">
                          {rec.description}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-warm-gray mt-1">
                          <span>
                            {t(`categories.${CATEGORY_KEYS[rec.category]}`)}
                          </span>
                          <span>•</span>
                          <span>
                            {rec.payer === 'Together'
                              ? t('payers.together')
                              : rec.payer}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {t('recurring.nextOccurrence', {
                              date: formatNextDate(rec),
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(rec.id)}
                          aria-label={t('recurring.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(rec.id)}
                          className="text-error hover:text-error hover:bg-error/10"
                          aria-label={t('recurring.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleCard>

      <Toast toast={toast} onClose={() => setToast(null)} />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={t('recurring.deleteConfirm')}
        message={t('recurring.deleteConfirmMessage')}
        confirmText={t('recurring.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
      />
    </>
  );
}
