'use client';

import { useEffect, useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import Toast from './Toast';

export default function TrashView() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [deletedRows, setDeletedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const householdId = profile?.household_id;

  useEffect(() => {
    if (isDemoMode) {
      setDeletedRows([]);
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
      setToast({
        id: toastId(),
        type: 'info',
        title: t('settings.demoNoRestore'),
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

  if (isDemoMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle gradient className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            {t('settings.trash')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-warm-gray text-sm">
            {t('demo.trashNotAvailable')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle gradient className="flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          {t('settings.trash')}
        </CardTitle>
        <p className="text-sm text-warm-gray mt-1">
          {t('settings.trashDescription')}
        </p>
      </CardHeader>
      <CardContent>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreTransaction(row.id)}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('settings.restore')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Card>
  );
}
