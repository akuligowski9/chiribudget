'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { getDemoTransactions } from '@/lib/demoStore';
import { ALL_CATEGORIES, PAYERS } from '@/lib/categories';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { List, Trash2, TrendingUp, TrendingDown, Flag } from 'lucide-react';
import Toast from './Toast';
import { toastId } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function TransactionList({ startDate, endDate, currency }) {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [_householdId, setHouseholdId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setDemoMode(getDemoMode());
    loadTransactions();
  }, [startDate, endDate, currency]);

  async function loadTransactions() {
    setLoading(true);

    if (getDemoMode()) {
      const month = startDate.slice(0, 7);
      const allTx = getDemoTransactions({ month, currency });
      const filtered = allTx.filter(
        (t) => t.txn_date >= startDate && t.txn_date <= endDate
      );
      setRows(filtered);
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) {
      setLoading(false);
      return;
    }

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

    const { data: tx, error } = await supabase
      .from('transactions')
      .select(
        'id,txn_date,description,amount,currency,category,payer,is_flagged'
      )
      .eq('household_id', p.household_id)
      .eq('currency', currency)
      .gte('txn_date', startDate)
      .lte('txn_date', endDate)
      .order('txn_date', { ascending: false });

    if (!error) {
      setRows(tx || []);
    }
    setLoading(false);
  }

  async function updateTransaction(id, field, value) {
    if (demoMode) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
      setToast({ id: toastId(), type: 'success', title: 'Updated (demo)' });
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
    }
  }

  async function deleteTransaction(id) {
    if (demoMode) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({ id: toastId(), type: 'success', title: 'Deleted (demo)' });
      return;
    }

    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Delete failed',
        message: error.message,
      });
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({ id: toastId(), type: 'success', title: 'Deleted' });
    }
  }

  const totalIncome = rows
    .filter((r) => r.amount > 0)
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = rows
    .filter((r) => r.amount < 0)
    .reduce((s, r) => s + Math.abs(Number(r.amount)), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-slate" />
          <CardTitle>Transactions</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-warm-gray">
            <div className="w-4 h-4 rounded-full bg-slate/20 animate-pulse" />
            <span className="text-sm">Loading...</span>
          </div>
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
            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.id || `${r.txn_date}-${r.amount}-${r.description}`}
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
                          {currency} {Math.abs(Number(r.amount)).toFixed(2)}
                        </div>
                      </div>

                      {/* Controls row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={r.category}
                          onChange={(e) =>
                            updateTransaction(r.id, 'category', e.target.value)
                          }
                          className="h-8 px-2 text-xs rounded-lg border border-white/60 bg-white/70 text-charcoal cursor-pointer"
                        >
                          {ALL_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>

                        <select
                          value={r.payer}
                          onChange={(e) =>
                            updateTransaction(r.id, 'payer', e.target.value)
                          }
                          className="h-8 px-2 text-xs rounded-lg border border-white/60 bg-white/70 text-charcoal cursor-pointer capitalize"
                        >
                          {PAYERS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() =>
                            updateTransaction(r.id, 'is_flagged', !r.is_flagged)
                          }
                          className={cn(
                            'h-8 px-2 rounded-lg border transition-all ml-auto',
                            r.is_flagged
                              ? 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30'
                              : 'bg-white/50 text-warm-gray border-white/60 hover:text-warning hover:bg-warning/10 opacity-60 group-hover:opacity-100'
                          )}
                          title={
                            r.is_flagged ? 'Remove flag' : 'Flag for discussion'
                          }
                        >
                          <Flag
                            className={cn(
                              'w-4 h-4',
                              r.is_flagged && 'fill-current'
                            )}
                          />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('Delete this transaction?')) {
                              deleteTransaction(r.id);
                            }
                          }}
                          className="h-8 px-2 rounded-lg bg-error/10 text-error hover:bg-error/20 border border-error/20 opacity-60 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CardContent>
    </Card>
  );
}
