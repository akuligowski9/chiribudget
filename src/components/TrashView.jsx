'use client';

import { useEffect, useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardContent,
  useCollapsible,
} from '@/components/ui/collapsible-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import {
  getDeletedDemoTransactions,
  restoreDemoTransaction,
  deleteDemoTransaction,
} from '@/lib/demoStore';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import Toast from './Toast';

export default function TrashView() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const { isOpen, toggle } = useCollapsible(false);
  const [deletedRows, setDeletedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmHardDelete, setConfirmHardDelete] = useState(null);

  const householdId = profile?.household_id;

  useEffect(() => {
    if (isDemoMode) {
      setDeletedRows(getDeletedDemoTransactions());
      setLoading(false);
      return;
    }

    if (!householdId) {
      setLoading(false);
      return;
    }

    async function fetchDeleted() {
      setLoading(true);
      // Fetch transactions where deleted_at is not null (within 30 days)
      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id, txn_date, amount, currency, category, description, deleted_at'
        )
        .eq('household_id', householdId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch deleted transactions:', error);
      } else {
        setDeletedRows(data || []);
      }
      setLoading(false);
    }

    fetchDeleted();
  }, [householdId, isDemoMode]);

  async function restoreTransaction(id) {
    if (isDemoMode) {
      restoreDemoTransaction(id);
      setDeletedRows((prev) => prev.filter((r) => r.id !== id));
      setToast({
        id: toastId(),
        type: 'success',
        title: t('settings.restored'),
        message: t('settings.restoreSuccess'),
      });
      return;
    }

    const { data, error } = await supabase.rpc('restore_transaction', {
      p_transaction_id: id,
    });

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('settings.restoreFailed'),
        message: error.message,
      });
    } else if (!data) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('settings.restoreFailed'),
        message: t('settings.transactionNotFound'),
      });
    } else {
      setDeletedRows((prev) => prev.filter((r) => r.id !== id));
      setToast({
        id: toastId(),
        type: 'success',
        title: t('settings.restored'),
        message: t('settings.restoreSuccess'),
      });
    }
  }

  async function hardDeleteTransaction(id) {
    if (isDemoMode) {
      deleteDemoTransaction(id);
      setDeletedRows((prev) => prev.filter((r) => r.id !== id));
      setToast({
        id: toastId(),
        type: 'success',
        title: t('settings.permanentlyDeleted') || 'Permanently deleted',
      });
      setConfirmHardDelete(null);
      return;
    }

    // Use direct delete since we're already looking at soft-deleted items
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('household_id', householdId);

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('settings.deleteFailed') || 'Delete failed',
        message: error.message,
      });
    } else {
      setDeletedRows((prev) => prev.filter((r) => r.id !== id));
      setToast({
        id: toastId(),
        type: 'success',
        title: t('settings.permanentlyDeleted') || 'Permanently deleted',
      });
    }
    setConfirmHardDelete(null);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  }

  function daysUntilPurge(deletedAt) {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt);
    const purgeDate = new Date(deleted);
    purgeDate.setDate(purgeDate.getDate() + 30);
    const now = new Date();
    const diff = Math.ceil((purgeDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  return (
    <CollapsibleCard>
      <CollapsibleCardHeader
        icon={Trash2}
        title={t('settings.trash')}
        description={t('settings.trashDescription')}
        isOpen={isOpen}
        onToggle={toggle}
      />
      <CollapsibleCardContent isOpen={isOpen}>
        {loading ? (
          <p className="text-warm-gray text-sm">{t('common.loading')}</p>
        ) : deletedRows.length === 0 ? (
          <p className="text-warm-gray text-sm">
            {t('settings.noDeletedItems')}
          </p>
        ) : (
          <div className="space-y-3">
            {deletedRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between p-3 bg-sand/30 rounded-xl"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {row.currency} {Math.abs(row.amount).toFixed(2)}
                    </span>
                    <span
                      className={`text-xs ${row.amount < 0 ? 'text-error' : 'text-success'}`}
                    >
                      {row.amount < 0
                        ? t('transaction.expense')
                        : t('transaction.income')}
                    </span>
                  </div>
                  <div className="text-xs text-warm-gray mt-0.5">
                    {row.category} · {formatDate(row.txn_date)}
                    {row.description && ` · ${row.description}`}
                  </div>
                  <div className="text-xs text-stone mt-1">
                    {t('settings.daysUntilDelete', {
                      days: daysUntilPurge(row.deleted_at),
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreTransaction(row.id)}
                    className="flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('settings.restore')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmHardDelete(row)}
                    className="flex items-center gap-1 text-error hover:text-error hover:bg-error/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('settings.deletePermanently') || 'Delete'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCardContent>

      {/* Hard delete confirmation dialog */}
      <ConfirmDialog
        open={!!confirmHardDelete}
        onClose={() => setConfirmHardDelete(null)}
        title={t('settings.confirmPermanentDelete') || 'Delete Permanently?'}
        message={
          t('settings.permanentDeleteWarning') ||
          'This transaction will be permanently deleted and cannot be recovered.'
        }
        confirmText={t('settings.deletePermanently') || 'Delete Permanently'}
        onConfirm={() => hardDeleteTransaction(confirmHardDelete?.id)}
        variant="danger"
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </CollapsibleCard>
  );
}
