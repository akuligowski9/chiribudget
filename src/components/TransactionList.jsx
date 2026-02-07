'use client';

import { useEffect, useState } from 'react';
import { List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SkeletonTransactionList } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { useDemo } from '@/hooks/useDemo';
import { TRANSACTIONS_PER_PAGE } from '@/lib/constants';
import { convertAmount } from '@/lib/currency';
import {
  getDemoTransactions,
  updateDemoTransaction,
  deleteDemoTransaction,
  softDeleteDemoTransaction,
} from '@/lib/demoStore';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import {
  sortTransactions,
  filterBySearch,
  filterByDateRange,
} from '@/lib/transactionUtils';
import Toast from './Toast';
import TransactionCard from './TransactionCard';
import TransactionPagination from './TransactionPagination';
import TransactionSearchSort from './TransactionSearchSort';
import TransactionSummaryBar from './TransactionSummaryBar';
import { ConfirmDialog } from './ui/confirm-dialog';

export default function TransactionList({
  startDate,
  endDate,
  currency, // Display currency (for conversion)
  onTransactionUpdate,
}) {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { conversionRate = 1, payerOptions = [] } = useAuth();
  const { getOfflineTxns, pendingCount } = useOffline();
  const [toast, setToast] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Search, sort, pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('txn_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [startDate, endDate, currency, searchQuery, sortField, sortAsc]);

  useEffect(() => {
    loadTransactions();
    // Also reload when pendingCount changes (after sync)
  }, [
    startDate,
    endDate,
    currency,
    searchQuery,
    sortField,
    sortAsc,
    page,
    pendingCount,
  ]);

  async function loadTransactions() {
    setLoading(true);

    if (isDemoMode) {
      await loadDemoTransactions();
      return;
    }

    await loadServerTransactions();
  }

  async function loadDemoTransactions() {
    const month = startDate.slice(0, 7);
    // Get ALL demo transactions (both currencies)
    const usdTx = getDemoTransactions({ month, currency: 'USD' });
    const penTx = getDemoTransactions({ month, currency: 'PEN' });
    const allTx = [...usdTx, ...penTx];

    let filtered = filterByDateRange(allTx, startDate, endDate);
    filtered = filterBySearch(filtered, searchQuery);
    filtered = sortTransactions(filtered, sortField, sortAsc);

    setTotalCount(filtered.length);
    // Apply pagination
    const paginated = filtered.slice(
      page * TRANSACTIONS_PER_PAGE,
      (page + 1) * TRANSACTIONS_PER_PAGE
    );
    setRows(paginated);
    setLoading(false);
  }

  async function loadServerTransactions() {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data: p } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!p?.household_id) {
      setLoading(false);
      return;
    }

    setHouseholdId(p.household_id);

    // Build query - include audit columns, fetch ALL currencies
    let query = supabase
      .from('transactions')
      .select(
        'id,txn_date,description,amount,currency,category,payer,is_flagged,created_by,updated_at,updated_by,source',
        { count: 'exact' }
      )
      .eq('household_id', p.household_id)
      .gte('txn_date', startDate)
      .lte('txn_date', endDate)
      .is('deleted_at', null);

    // Apply search filter
    if (searchQuery.trim()) {
      query = query.ilike('description', `%${searchQuery.trim()}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortField, { ascending: sortAsc })
      .range(
        page * TRANSACTIONS_PER_PAGE,
        (page + 1) * TRANSACTIONS_PER_PAGE - 1
      );

    const { data: tx, error, count } = await query;

    if (!error) {
      // Merge with offline transactions
      const allRows = await mergeWithOfflineTransactions(tx || []);
      setRows(allRows);
      setTotalCount((count || 0) + (allRows.length - (tx?.length || 0)));
    }
    setLoading(false);
  }

  async function mergeWithOfflineTransactions(serverTx) {
    const month = startDate.slice(0, 7);
    let allRows = serverTx;

    try {
      // Get offline transactions for both currencies in this date range
      const offlineUsd = await getOfflineTxns({ month, currency: 'USD' });
      const offlinePen = await getOfflineTxns({ month, currency: 'PEN' });
      const offlineTxns = filterByDateRange(
        [...offlineUsd, ...offlinePen],
        startDate,
        endDate
      );

      if (offlineTxns.length > 0) {
        // Add offline transactions (they have _syncStatus field)
        allRows = [...offlineTxns, ...allRows];

        // Re-apply search filter to merged data
        allRows = filterBySearch(allRows, searchQuery);

        // Re-apply sorting
        allRows = sortTransactions(allRows, sortField, sortAsc);
      }
    } catch (offlineErr) {
      // Offline store not available or error, continue with server data only
      console.warn('Could not fetch offline transactions:', offlineErr);
    }

    return allRows;
  }

  async function updateTransaction(id, field, value) {
    if (isDemoMode) {
      // Update the demoStore so other components see the change
      updateDemoTransaction(id, { [field]: value });
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
      setToast({
        id: toastId(),
        type: 'success',
        title: t('transaction.updatedDemo'),
      });
      onTransactionUpdate?.();
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('transaction.updateFailed'),
        message: error.message,
      });
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
      setToast({
        id: toastId(),
        type: 'success',
        title: t('transaction.updated'),
      });
      onTransactionUpdate?.();
    }
  }

  async function deleteTransaction(id) {
    if (isDemoMode) {
      // Soft-delete in demoStore so it appears in trash
      softDeleteDemoTransaction(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({
        id: toastId(),
        type: 'success',
        title: t('transaction.movedToTrash'),
        message: t('transaction.canRestore30Days'),
      });
      onTransactionUpdate?.();
      return;
    }

    // Use soft delete instead of hard delete
    const { data, error } = await supabase.rpc('soft_delete_transaction', {
      p_transaction_id: id,
    });

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('transaction.deleteFailed'),
        message: error.message,
      });
    } else if (!data) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('transaction.deleteFailed'),
        message: t('transaction.notFoundOrDeleted'),
      });
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({
        id: toastId(),
        type: 'success',
        title: t('transaction.movedToTrash'),
        message: t('transaction.canRestore30Days'),
      });
      onTransactionUpdate?.();
    }
  }

  async function hardDeleteTransaction(id) {
    if (isDemoMode) {
      deleteDemoTransaction(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({
        id: toastId(),
        type: 'success',
        title: t('transaction.permanentlyDeleted'),
      });
      onTransactionUpdate?.();
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('household_id', householdId);

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('transaction.deleteFailed'),
        message: error.message,
      });
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({
        id: toastId(),
        type: 'success',
        title: t('transaction.permanentlyDeleted'),
      });
      onTransactionUpdate?.();
    }
  }

  // Convert amounts to display currency for totals
  const totalIncome = rows
    .filter((r) => r.amount > 0)
    .reduce(
      (s, r) =>
        s +
        convertAmount(Number(r.amount), r.currency, currency, conversionRate),
      0
    );
  const totalExpenses = rows
    .filter((r) => r.amount < 0)
    .reduce(
      (s, r) =>
        s +
        Math.abs(
          convertAmount(Number(r.amount), r.currency, currency, conversionRate)
        ),
      0
    );

  function toggleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  function handleDeleteClick(id) {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  }

  const totalPages = Math.ceil(totalCount / TRANSACTIONS_PER_PAGE);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-slate" />
            <CardTitle>{t('transaction.title')}</CardTitle>
          </div>
          <TransactionSearchSort
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortField={sortField}
            sortAsc={sortAsc}
            onToggleSort={toggleSort}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SkeletonTransactionList rows={5} />
        ) : rows.length === 0 ? (
          <p className="text-warm-gray text-sm">
            {t('transaction.noTransactions')}
          </p>
        ) : (
          <>
            <TransactionSummaryBar
              count={rows.length}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              currency={currency}
            />

            {/* Transaction cards */}
            <div
              className="space-y-2"
              role="list"
              aria-label="Transaction list"
            >
              {rows.map((r) => (
                <TransactionCard
                  key={r.id || `${r.txn_date}-${r.amount}-${r.description}`}
                  transaction={r}
                  currency={currency}
                  conversionRate={conversionRate}
                  payerOptions={payerOptions}
                  currentUserId={currentUserId}
                  isDemoMode={isDemoMode}
                  isEditing={editingId === r.id}
                  onEditStart={setEditingId}
                  onEditEnd={() => setEditingId(null)}
                  onUpdate={updateTransaction}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>

            <TransactionPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => {
            setConfirmOpen(false);
            setDeleteTargetId(null);
          }}
          onConfirm={() => {
            if (deleteTargetId) {
              deleteTransaction(deleteTargetId);
            }
          }}
          onSecondaryConfirm={() => {
            if (deleteTargetId) {
              hardDeleteTransaction(deleteTargetId);
            }
          }}
          title={t('transaction.deleteTransaction')}
          message={t('transaction.deleteConfirmMessage')}
          confirmText={t('transaction.moveToTrash')}
          secondaryConfirmText={t('transaction.deletePermanently')}
          cancelText={t('common.cancel')}
          variant="danger"
        />
      </CardContent>
    </Card>
  );
}
