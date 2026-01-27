'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileUp,
  Filter,
  History,
  ImageIcon,
  Square,
  Tag,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import ImportUpload from '@/components/ImportUpload';
import Toast from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { ALL_CATEGORIES } from '@/lib/categories';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

// Demo data for unsorted transactions
const DEMO_UNSORTED = [
  {
    id: 'demo-batch-1',
    display_name: 'Interbank Oct 2025',
    source_bank: 'interbank',
    source_type: 'screenshot',
    default_payer: 'Partner 2',
    date_range_start: '2025-10-01',
    date_range_end: '2025-10-16',
    created_at: new Date().toISOString(),
    transactions: [
      {
        id: 'demo-pending-1',
        txn_date: '2025-10-04',
        description: 'Veterinaria My Pet',
        amount: -365.0,
        currency: 'PEN',
        category: 'Unexpected',
        payer: 'Partner 2',
      },
      {
        id: 'demo-pending-2',
        txn_date: '2025-10-05',
        description: 'Ripley',
        amount: -82.89,
        currency: 'PEN',
        category: 'Unexpected',
        payer: 'Partner 2',
      },
      {
        id: 'demo-pending-3',
        txn_date: '2025-10-10',
        description: 'Dental',
        amount: -380.0,
        currency: 'PEN',
        category: 'Unexpected',
        payer: 'Partner 2',
      },
    ],
  },
];

export default function UnsortedTransactions() {
  const t = useTranslations();
  const { profile, payerOptions } = useAuth();
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [payerFilter, setPayerFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [batchFilters, setBatchFilters] = useState({}); // Track filter per batch: 'all' | 'reviewed' | 'needs-review'
  const [collapsedBatches, setCollapsedBatches] = useState(new Set()); // Track which batches are collapsed
  const [allBatchTransactions, setAllBatchTransactions] = useState({}); // Cache of all txns per batch

  // Load transactions grouped by import batch
  useEffect(() => {
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.household_id, isDemoMode, showHistory]);

  async function loadBatches() {
    if (isDemoMode) {
      setBatches(DEMO_UNSORTED);
      setLoading(false);
      return;
    }

    if (!profile?.household_id) {
      setLoading(false);
      return;
    }

    try {
      // Get import batches - filter by status unless showing history
      let batchQuery = supabase
        .from('import_batches')
        .select('*')
        .eq('household_id', profile.household_id)
        .order('created_at', { ascending: false });

      if (!showHistory) {
        batchQuery = batchQuery.eq('status', 'staged');
      }

      const { data: batchData, error: batchErr } = await batchQuery;
      if (batchErr) throw batchErr;

      // Get transactions - filter by category unless showing history
      let txQuery = supabase
        .from('transactions')
        .select('*')
        .eq('household_id', profile.household_id)
        .is('deleted_at', null)
        .order('txn_date', { ascending: false });

      if (!showHistory) {
        // Show only uncategorized transactions (category = 'Unexpected')
        txQuery = txQuery.eq('category', 'Unexpected');
      }

      const { data: txData, error: txErr } = await txQuery;
      if (txErr) throw txErr;

      // Group transactions by import_batch_id
      const batchesWithTx = (batchData || []).map((batch) => ({
        ...batch,
        transactions: (txData || []).filter(
          (tx) => tx.import_batch_id === batch.id
        ),
      }));

      // Include transactions without batch (manual entries)
      const orphanTx = (txData || []).filter((tx) => !tx.import_batch_id);
      if (orphanTx.length > 0) {
        batchesWithTx.push({
          id: 'manual',
          display_name: t('unsorted.manualEntries'),
          source_type: 'manual',
          default_payer: 'Together',
          created_at: new Date().toISOString(),
          status: 'manual',
          transactions: orphanTx,
        });
      }

      // Filter out empty batches when showing history
      const nonEmptyBatches = showHistory
        ? batchesWithTx
        : batchesWithTx.filter((b) => b.transactions.length > 0);

      setBatches(nonEmptyBatches);
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('common.error'),
        message: e.message,
      });
    } finally {
      setLoading(false);
    }
  }

  // Filter batches by payer
  const filteredBatches = useMemo(() => {
    if (payerFilter === 'all') return batches;
    return batches
      .map((batch) => ({
        ...batch,
        transactions: batch.transactions.filter(
          (tx) => tx.payer === payerFilter
        ),
      }))
      .filter((batch) => batch.transactions.length > 0);
  }, [batches, payerFilter]);

  // Get all transaction IDs for selection
  const allTransactionIds = useMemo(() => {
    return filteredBatches.flatMap((b) => b.transactions.map((tx) => tx.id));
  }, [filteredBatches]);

  // Selection helpers
  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === allTransactionIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allTransactionIds));
    }
  };

  // Update transaction field
  async function updateTransaction(txId, field, value) {
    if (isDemoMode) {
      // Update local state for demo
      setBatches((prev) =>
        prev.map((batch) => ({
          ...batch,
          transactions: batch.transactions.map((tx) =>
            tx.id === txId ? { ...tx, [field]: value } : tx
          ),
        }))
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ [field]: value })
        .eq('id', txId);

      if (error) throw error;

      // Update local state
      setBatches((prev) =>
        prev.map((batch) => ({
          ...batch,
          transactions: batch.transactions.map((tx) =>
            tx.id === txId ? { ...tx, [field]: value } : tx
          ),
        }))
      );
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('unsorted.updateFailed'),
        message: e.message,
      });
    }
  }

  // Batch update selected transactions
  async function batchUpdate(field, value) {
    if (selectedIds.size === 0) return;

    if (isDemoMode) {
      setBatches((prev) =>
        prev.map((batch) => ({
          ...batch,
          transactions: batch.transactions.map((tx) =>
            selectedIds.has(tx.id) ? { ...tx, [field]: value } : tx
          ),
        }))
      );
      setToast({
        id: toastId(),
        type: 'success',
        title: t('unsorted.updated'),
        message: t('unsorted.updatedCount', { count: selectedIds.size }),
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ [field]: value })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      setBatches((prev) =>
        prev.map((batch) => ({
          ...batch,
          transactions: batch.transactions.map((tx) =>
            selectedIds.has(tx.id) ? { ...tx, [field]: value } : tx
          ),
        }))
      );

      setToast({
        id: toastId(),
        type: 'success',
        title: t('unsorted.updated'),
        message: t('unsorted.updatedCount', { count: selectedIds.size }),
      });
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('unsorted.updateFailed'),
        message: e.message,
      });
    }
  }

  // Confirm selected transactions (move to dashboard)
  async function confirmSelected() {
    if (selectedIds.size === 0) return;

    if (isDemoMode) {
      setBatches((prev) =>
        prev.map((batch) => ({
          ...batch,
          transactions: batch.transactions.filter(
            (tx) => !selectedIds.has(tx.id)
          ),
        }))
      );
      setSelectedIds(new Set());
      setToast({
        id: toastId(),
        type: 'success',
        title: t('unsorted.confirmed'),
        message: t('unsorted.confirmedCount', { count: selectedIds.size }),
      });
      return;
    }

    try {
      // Transactions are "confirmed" when they have a category set (not 'Unexpected')
      // No database update needed - just clear selection and refresh
      const count = selectedIds.size;
      setSelectedIds(new Set());
      await loadBatches();

      setToast({
        id: toastId(),
        type: 'success',
        title: t('unsorted.confirmed'),
        message: t('unsorted.confirmedCount', { count }),
      });
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('unsorted.confirmFailed'),
        message: e.message,
      });
    }
  }

  // Set filter for a batch: 'all' | 'reviewed' | 'needs-review'
  async function setBatchFilter(batchId, filter) {
    // Fetch all transactions if switching away from needs-review and not cached
    if (
      filter !== 'needs-review' &&
      !allBatchTransactions[batchId] &&
      !isDemoMode
    ) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('import_batch_id', batchId)
          .is('deleted_at', null)
          .order('txn_date', { ascending: false });

        if (!error && data) {
          setAllBatchTransactions((prev) => ({
            ...prev,
            [batchId]: data,
          }));
        }
      } catch (_e) {
        // Error loading batch transactions - silently fail
      }
    }

    setBatchFilters((prev) => ({
      ...prev,
      [batchId]: filter,
    }));
  }

  // Toggle collapsing the entire batch section
  function toggleBatchCollapsed(batchId) {
    const newCollapsed = new Set(collapsedBatches);
    if (newCollapsed.has(batchId)) {
      newCollapsed.delete(batchId);
    } else {
      newCollapsed.add(batchId);
    }
    setCollapsedBatches(newCollapsed);
  }

  // Get transactions to display for a batch based on filter
  function getBatchDisplayTransactions(batch) {
    const filter = batchFilters[batch.id] || 'needs-review';
    const allTxns = allBatchTransactions[batch.id] || batch.transactions;

    switch (filter) {
      case 'all':
        return allTxns;
      case 'reviewed':
        return allTxns.filter((tx) => tx.category !== 'Unexpected');
      case 'needs-review':
      default:
        return batch.transactions; // Already filtered to Unexpected in query
    }
  }

  // Total pending count
  const totalPending = filteredBatches.reduce(
    (sum, b) => sum + b.transactions.length,
    0
  );

  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <div className="space-y-4">
      {/* Header with Upload button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-slate" />
              <CardTitle>{t('unsorted.title')}</CardTitle>
              {totalPending > 0 && (
                <span className="bg-warning text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  {totalPending}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showHistory ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="w-4 h-4 mr-2" />
                {t('unsorted.history')}
              </Button>
              <Button onClick={() => setShowUpload(true)} size="sm">
                <ImageIcon className="w-4 h-4 mr-2" />
                {t('unsorted.import')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-warm-gray" />
              <span className="text-sm text-warm-gray">
                {t('unsorted.filterBy')}
              </span>
            </div>
            <Select value={payerFilter} onValueChange={setPayerFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('unsorted.allPayers')}</SelectItem>
                {payerOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p === 'Together' ? t('payers.together') : p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Batch actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-accent/10 rounded-xl border border-accent/20">
              <span className="text-sm font-medium text-charcoal">
                {t('unsorted.selectedCount', { count: selectedIds.size })}
              </span>
              <div className="flex-1" />

              {/* Set Category */}
              <Select onValueChange={(v) => batchUpdate('category', v)}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  <span>{t('unsorted.setCategory')}</span>
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Set Payer */}
              <Select onValueChange={(v) => batchUpdate('payer', v)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <User className="w-3 h-3 mr-1" />
                  <span>{t('unsorted.setPayer')}</span>
                </SelectTrigger>
                <SelectContent>
                  {payerOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === 'Together' ? t('payers.together') : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Confirm */}
              <Button size="sm" onClick={confirmSelected}>
                <Check className="w-4 h-4 mr-1" />
                {t('unsorted.confirm')}
              </Button>
            </div>
          )}

          {/* Empty state */}
          {filteredBatches.length === 0 ||
          filteredBatches.every((b) => b.transactions.length === 0) ? (
            <div className="text-center py-12">
              <FileUp className="w-12 h-12 text-warm-gray mx-auto mb-3 opacity-50" />
              <p className="text-warm-gray">{t('unsorted.empty')}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowUpload(true)}
              >
                {t('unsorted.importFirst')}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Each batch as its own card */}
      {filteredBatches.map((batch) => {
        if (batch.transactions.length === 0 && !expandedBatches.has(batch.id))
          return null;

        const displayTransactions = getBatchDisplayTransactions(batch);
        const currentFilter = batchFilters[batch.id] || 'needs-review';
        const isCollapsed = collapsedBatches.has(batch.id);
        const pendingCount = batch.transactions.length;
        const allTxns = allBatchTransactions[batch.id];
        const totalCount = allTxns?.length || pendingCount;
        const _reviewedCount = allTxns
          ? allTxns.filter((tx) => tx.category !== 'Unexpected').length
          : totalCount - pendingCount;

        return (
          <Card key={batch.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {/* Collapse/Expand toggle */}
                <button
                  onClick={() => toggleBatchCollapsed(batch.id)}
                  className="p-1 hover:bg-slate/10 rounded"
                  title={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-warm-gray" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-warm-gray" />
                  )}
                </button>
                <button
                  onClick={selectAll}
                  className="p-1 hover:bg-slate/10 rounded"
                >
                  {selectedIds.size === allTransactionIds.length &&
                  allTransactionIds.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-accent" />
                  ) : (
                    <Square className="w-4 h-4 text-warm-gray" />
                  )}
                </button>
                <CardTitle className="text-base">
                  {batch.display_name ||
                    `${batch.source_bank || 'Import'} - ${batch.month || ''}`}
                </CardTitle>
                <span className="text-sm text-warm-gray">
                  ({displayTransactions.length})
                </span>
                {batch.date_range_start && batch.date_range_end && (
                  <span className="text-xs text-warm-gray">
                    {batch.date_range_start} → {batch.date_range_end}
                  </span>
                )}
                <div className="flex-1" />
                {/* Filter buttons: All / Reviewed / Needs Review */}
                {batch.id !== 'manual' && !isCollapsed && (
                  <div className="flex rounded-lg border border-slate/20 overflow-hidden">
                    <button
                      onClick={() => setBatchFilter(batch.id, 'all')}
                      className={cn(
                        'px-3 py-1 text-xs font-medium transition-colors',
                        currentFilter === 'all'
                          ? 'bg-slate text-white'
                          : 'bg-white/50 text-warm-gray hover:bg-white/80'
                      )}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setBatchFilter(batch.id, 'reviewed')}
                      className={cn(
                        'px-3 py-1 text-xs font-medium transition-colors border-x border-slate/20',
                        currentFilter === 'reviewed'
                          ? 'bg-slate text-white'
                          : 'bg-white/50 text-warm-gray hover:bg-white/80'
                      )}
                    >
                      Sorted
                    </button>
                    <button
                      onClick={() => setBatchFilter(batch.id, 'needs-review')}
                      className={cn(
                        'px-3 py-1 text-xs font-medium transition-colors',
                        currentFilter === 'needs-review'
                          ? 'bg-slate text-white'
                          : 'bg-white/50 text-warm-gray hover:bg-white/80'
                      )}
                    >
                      Unsorted
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            {!isCollapsed && (
              <CardContent>
                <div className="space-y-1">
                  {displayTransactions.map((tx) => {
                    // Transaction is "sorted" if it's been categorized (not 'Unexpected')
                    const isSorted = tx.category !== 'Unexpected';
                    return (
                      <div
                        key={tx.id}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-xl border transition-colors',
                          isSorted
                            ? 'bg-success/10 border-success/30 hover:bg-success/15'
                            : selectedIds.has(tx.id)
                              ? 'bg-accent/10 border-accent/30'
                              : 'bg-white/40 border-white/60 hover:bg-white/60'
                        )}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelect(tx.id)}
                          className="p-1 rounded hover:bg-slate/10"
                        >
                          {isSorted ? (
                            selectedIds.has(tx.id) ? (
                              <CheckSquare className="w-4 h-4 text-success" />
                            ) : (
                              <Check className="w-4 h-4 text-success" />
                            )
                          ) : selectedIds.has(tx.id) ? (
                            <CheckSquare className="w-4 h-4 text-accent" />
                          ) : (
                            <Square className="w-4 h-4 text-warm-gray" />
                          )}
                        </button>

                        {/* Date */}
                        <div className="w-20 text-xs text-warm-gray">
                          {tx.txn_date}
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-charcoal text-sm truncate">
                            {tx.description || t('transaction.noDescription')}
                          </div>
                        </div>

                        {/* Amount */}
                        <div
                          className={cn(
                            'font-bold text-sm whitespace-nowrap',
                            tx.amount < 0 ? 'text-error' : 'text-success'
                          )}
                        >
                          {tx.currency} {Math.abs(tx.amount).toFixed(2)}
                        </div>

                        {/* Category dropdown */}
                        <Select
                          value={tx.category}
                          onValueChange={(v) =>
                            updateTransaction(tx.id, 'category', v)
                          }
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Payer dropdown */}
                        <Select
                          value={tx.payer}
                          onValueChange={(v) =>
                            updateTransaction(tx.id, 'payer', v)
                          }
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {payerOptions.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p === 'Together' ? t('payers.together') : p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Import Upload Modal */}
      {showUpload && (
        <ImportUpload
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            loadBatches();
          }}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
