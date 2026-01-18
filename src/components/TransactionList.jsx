'use client';

import { useEffect, useState } from 'react';
import {
  List,
  Trash2,
  TrendingUp,
  TrendingDown,
  Flag,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonTransactionList } from '@/components/ui/skeleton';
import { useDemo } from '@/hooks/useDemo';
import { ALL_CATEGORIES, CURRENCIES, PAYERS } from '@/lib/categories';
import { TRANSACTIONS_PER_PAGE } from '@/lib/constants';
import { getDemoTransactions } from '@/lib/demoStore';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import Toast from './Toast';
import { ConfirmDialog } from './ui/confirm-dialog';

export default function TransactionList({
  startDate,
  endDate,
  currency,
  onTransactionUpdate,
}) {
  const { isDemoMode } = useDemo();
  const [toast, setToast] = useState(null);
  const [_householdId, setHouseholdId] = useState(null);
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
  }, [startDate, endDate, currency, searchQuery, sortField, sortAsc, page]);

  async function loadTransactions() {
    setLoading(true);

    if (isDemoMode) {
      const month = startDate.slice(0, 7);
      const allTx = getDemoTransactions({ month, currency });
      let filtered = allTx.filter(
        (t) => t.txn_date >= startDate && t.txn_date <= endDate
      );

      // Apply search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.description?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q)
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let cmp = 0;
        if (sortField === 'txn_date') {
          cmp = a.txn_date.localeCompare(b.txn_date);
        } else if (sortField === 'amount') {
          cmp = Math.abs(a.amount) - Math.abs(b.amount);
        }
        return sortAsc ? cmp : -cmp;
      });

      setTotalCount(filtered.length);
      // Apply pagination
      const paginated = filtered.slice(
        page * TRANSACTIONS_PER_PAGE,
        (page + 1) * TRANSACTIONS_PER_PAGE
      );
      setRows(paginated);
      setLoading(false);
      return;
    }

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

    // Build query - include audit columns
    let query = supabase
      .from('transactions')
      .select(
        'id,txn_date,description,amount,currency,category,payer,is_flagged,created_by,updated_at,updated_by',
        { count: 'exact' }
      )
      .eq('household_id', p.household_id)
      .eq('currency', currency)
      .gte('txn_date', startDate)
      .lte('txn_date', endDate);

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
      setRows(tx || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }

  async function updateTransaction(id, field, value) {
    if (isDemoMode) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
      setToast({ id: toastId(), type: 'success', title: 'Updated (demo)' });
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
        title: 'Update failed',
        message: error.message,
      });
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
      setToast({ id: toastId(), type: 'success', title: 'Updated' });
      onTransactionUpdate?.();
    }
  }

  async function deleteTransaction(id) {
    if (isDemoMode) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({ id: toastId(), type: 'success', title: 'Deleted (demo)' });
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
        title: 'Delete failed',
        message: error.message,
      });
    } else if (!data) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Delete failed',
        message: 'Transaction not found or already deleted',
      });
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({
        id: toastId(),
        type: 'success',
        title: 'Moved to trash',
        message: 'Transaction can be restored within 30 days',
      });
      onTransactionUpdate?.();
    }
  }

  const totalIncome = rows
    .filter((r) => r.amount > 0)
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = rows
    .filter((r) => r.amount < 0)
    .reduce((s, r) => s + Math.abs(Number(r.amount)), 0);

  function toggleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  const totalPages = Math.ceil(totalCount / TRANSACTIONS_PER_PAGE);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-slate" />
            <CardTitle>Transactions</CardTitle>
          </div>

          {/* Search input */}
          <div className="relative flex-1 max-w-xs">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
              aria-label="Search transactions by description or category"
            />
          </div>
        </div>

        {/* Sort controls */}
        <div
          className="flex gap-2 mt-3"
          role="group"
          aria-label="Sort transactions"
        >
          <Button
            variant={sortField === 'txn_date' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => toggleSort('txn_date')}
            className="text-xs"
            aria-pressed={sortField === 'txn_date'}
            aria-label={`Sort by date ${sortField === 'txn_date' ? (sortAsc ? 'ascending' : 'descending') : ''}`}
          >
            <ArrowUpDown className="w-3 h-3 mr-1" aria-hidden="true" />
            Date {sortField === 'txn_date' && (sortAsc ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortField === 'amount' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => toggleSort('amount')}
            className="text-xs"
            aria-pressed={sortField === 'amount'}
            aria-label={`Sort by amount ${sortField === 'amount' ? (sortAsc ? 'ascending' : 'descending') : ''}`}
          >
            <ArrowUpDown className="w-3 h-3 mr-1" aria-hidden="true" />
            Amount {sortField === 'amount' && (sortAsc ? '↑' : '↓')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SkeletonTransactionList rows={5} />
        ) : rows.length === 0 ? (
          <p className="text-warm-gray text-sm">
            No transactions for this period.
          </p>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <div className="bg-white/50 rounded-lg px-3 py-1.5 border border-white/60">
                <span className="text-stone">
                  {rows.length} transaction{rows.length !== 1 && 's'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-success/10 rounded-lg px-3 py-1.5 border border-success/20">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="font-semibold text-success">
                  +{currency} {totalIncome.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-error/10 rounded-lg px-3 py-1.5 border border-error/20">
                <TrendingDown className="w-3.5 h-3.5 text-error" />
                <span className="font-semibold text-error">
                  -{currency} {totalExpenses.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Transaction cards */}
            <div
              className="space-y-2"
              role="list"
              aria-label="Transaction list"
            >
              {rows.map((r) => (
                <div
                  key={r.id || `${r.txn_date}-${r.amount}-${r.description}`}
                  role="listitem"
                  aria-label={`${r.description || 'No description'}, ${r.amount < 0 ? 'expense' : 'income'} of ${currency} ${Math.abs(Number(r.amount)).toFixed(2)}`}
                  className={cn(
                    'rounded-xl p-3 transition-all duration-200 group',
                    r.is_flagged
                      ? 'bg-gradient-to-r from-warning/15 to-warning/5 border border-warning/30'
                      : 'bg-white/40 border border-white/60 hover:bg-white/60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Amount indicator */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                        r.amount < 0
                          ? 'bg-gradient-to-br from-error/20 to-error/10 text-error'
                          : 'bg-gradient-to-br from-success/20 to-success/10 text-success'
                      )}
                    >
                      {r.amount < 0 ? (
                        <TrendingDown className="w-5 h-5" />
                      ) : (
                        <TrendingUp className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        {/* Description */}
                        <div className="flex-1">
                          {editingId === r.id ? (
                            <Input
                              type="text"
                              defaultValue={r.description || ''}
                              onBlur={(e) => {
                                updateTransaction(
                                  r.id,
                                  'description',
                                  e.target.value
                                );
                                setEditingId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateTransaction(
                                    r.id,
                                    'description',
                                    e.target.value
                                  );
                                  setEditingId(null);
                                }
                              }}
                              // eslint-disable-next-line jsx-a11y/no-autofocus
                              autoFocus
                              className="h-8 text-sm"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingId(r.id)}
                              className={cn(
                                'text-sm font-semibold text-left hover:text-slate transition-colors',
                                r.description
                                  ? 'text-charcoal'
                                  : 'text-warm-gray'
                              )}
                              title="Click to edit"
                            >
                              {r.description || '(no description)'}
                            </button>
                          )}
                          <div className="text-xs text-warm-gray mt-0.5">
                            {r.txn_date}
                            {!isDemoMode && r.created_by && (
                              <span className="ml-1.5">
                                •{' '}
                                {r.created_by === currentUserId
                                  ? 'by you'
                                  : 'by partner'}
                                {r.updated_at && r.updated_by && (
                                  <span className="text-stone/60">
                                    {' '}
                                    (edited)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div
                          className={cn(
                            'font-bold text-sm whitespace-nowrap',
                            r.amount < 0 ? 'text-error' : 'text-success'
                          )}
                        >
                          {r.amount < 0 ? '-' : '+'}
                          {r.currency} {Math.abs(Number(r.amount)).toFixed(2)}
                        </div>
                      </div>

                      {/* Controls row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={r.category}
                          onValueChange={(value) =>
                            updateTransaction(r.id, 'category', value)
                          }
                        >
                          <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={r.payer}
                          onValueChange={(value) =>
                            updateTransaction(r.id, 'payer', value)
                          }
                        >
                          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYERS.map((p) => (
                              <SelectItem
                                key={p}
                                value={p}
                                className="text-xs capitalize"
                              >
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={r.currency}
                          onValueChange={(value) =>
                            updateTransaction(r.id, 'currency', value)
                          }
                        >
                          <SelectTrigger className="h-8 w-auto min-w-[70px] text-xs font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c} className="text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <button
                          onClick={() =>
                            updateTransaction(r.id, 'is_flagged', !r.is_flagged)
                          }
                          className={cn(
                            'h-8 px-2 rounded-lg border transition-all ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-1',
                            r.is_flagged
                              ? 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30'
                              : 'bg-white/50 text-warm-gray border-white/60 hover:text-warning hover:bg-warning/10 opacity-60 group-hover:opacity-100'
                          )}
                          title={
                            r.is_flagged ? 'Remove flag' : 'Flag for discussion'
                          }
                          aria-label={
                            r.is_flagged
                              ? 'Remove flag from this transaction'
                              : 'Flag this transaction for discussion'
                          }
                          aria-pressed={r.is_flagged}
                        >
                          <Flag
                            className={cn(
                              'w-4 h-4',
                              r.is_flagged && 'fill-current'
                            )}
                            aria-hidden="true"
                          />
                        </button>

                        <button
                          onClick={() => {
                            setDeleteTargetId(r.id);
                            setConfirmOpen(true);
                          }}
                          className="h-8 px-2 rounded-lg bg-error/10 text-error hover:bg-error/20 border border-error/20 opacity-60 group-hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-1"
                          aria-label="Delete this transaction"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <nav
                className="flex items-center justify-between mt-4 pt-4 border-t border-white/40"
                aria-label="Transaction pagination"
              >
                <span className="text-sm text-warm-gray" aria-live="polite">
                  Page {page + 1} of {totalPages} ({totalCount} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    aria-label="Go to next page"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </nav>
            )}
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
          title="Delete Transaction"
          message="Move this transaction to trash? You can restore it within 30 days."
          confirmText="Move to Trash"
          cancelText="Cancel"
          variant="danger"
        />
      </CardContent>
    </Card>
  );
}
