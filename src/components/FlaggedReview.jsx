'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { getDemoTransactions } from '@/lib/demoStore';
import { CURRENCIES } from '@/lib/categories';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Flag,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import Toast from './Toast';
import { toastId } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function FlaggedReview({ currency, onCurrencyChange }) {
  const [demoMode, setDemoMode] = useState(false);
  const [_householdId, setHouseholdId] = useState(null);
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setDemoMode(getDemoMode());
    loadFlagged();
  }, [currency]);

  async function loadFlagged() {
    if (getDemoMode()) {
      // Get all flagged demo transactions
      const month = new Date().toISOString().slice(0, 7);
      const tx = getDemoTransactions({ month, currency }).filter(
        (t) => t.is_flagged
      );
      setRows(tx);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;

    const { data: p } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!p?.household_id) return;
    setHouseholdId(p.household_id);

    const { data: tx, error } = await supabase
      .from('transactions')
      .select(
        'id,txn_date,description,amount,currency,category,payer,is_flagged,explanation'
      )
      .eq('household_id', p.household_id)
      .eq('currency', currency)
      .eq('is_flagged', true)
      .order('txn_date', { ascending: false });

    if (!error) setRows(tx || []);
  }

  async function saveExplanation(id, explanation) {
    if (demoMode) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, explanation } : r))
      );
      setToast({ id: toastId(), type: 'success', title: 'Saved (demo)' });
      return;
    }
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ explanation })
        .eq('id', id);
      if (error) throw error;
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, explanation } : r))
      );
      setToast({ id: toastId(), type: 'success', title: 'Saved' });
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Save failed',
        message: e.message,
      });
    }
  }

  async function unflag(id) {
    if (demoMode) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({ id: toastId(), type: 'success', title: 'Unflagged (demo)' });
      return;
    }
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ is_flagged: false })
        .eq('id', id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast({ id: toastId(), type: 'success', title: 'Unflagged' });
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Failed',
        message: e.message,
      });
    }
  }

  const unresolved = rows.filter(
    (r) => !(r.explanation && r.explanation.trim().length > 0)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-warning" />
            <CardTitle>Flagged for Review</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {unresolved.length > 0 ? (
              <div className="flex items-center gap-1.5 bg-warning/15 text-warning px-2.5 py-1 rounded-full border border-warning/30 text-sm">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-semibold">
                  {unresolved.length} unresolved
                </span>
              </div>
            ) : rows.length > 0 ? (
              <div className="flex items-center gap-1.5 bg-success/15 text-success px-2.5 py-1 rounded-full border border-success/30 text-sm">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="font-semibold">All resolved</span>
              </div>
            ) : null}
            <select
              value={currency}
              onChange={(e) => onCurrencyChange?.(e.target.value)}
              className="w-20 h-8 px-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 bg-gradient-to-r from-accent to-accent-light text-white border-2 border-accent/30 shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/35"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-white text-charcoal">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-stone text-sm mb-4">
          Transactions flagged from the Dashboard appear here. Add explanations
          to resolve them.
        </p>

        {rows.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-slate/10 flex items-center justify-center mx-auto mb-3">
              <Flag className="w-6 h-6 text-slate/40" />
            </div>
            <p className="text-warm-gray text-sm">No flagged transactions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const hasExplanation =
                r.explanation && r.explanation.trim().length > 0;
              return (
                <div
                  key={r.id || `${r.txn_date}-${r.amount}-${r.description}`}
                  className={cn(
                    'rounded-xl p-4 transition-all duration-200',
                    hasExplanation
                      ? 'bg-white/40 border border-white/60'
                      : 'bg-gradient-to-r from-warning/15 to-warning/5 border border-warning/30'
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
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
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-charcoal">
                            {r.description || '(no description)'}
                          </div>
                          <div className="text-xs text-warm-gray mt-0.5">
                            {r.txn_date} &middot; {r.category} &middot;{' '}
                            {r.payer}
                          </div>
                        </div>
                        <div
                          className={cn(
                            'font-bold whitespace-nowrap',
                            r.amount < 0 ? 'text-error' : 'text-success'
                          )}
                        >
                          {r.currency} {Number(r.amount).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-13">
                    <textarea
                      defaultValue={r.explanation || ''}
                      placeholder="Add explanation..."
                      className="w-full min-h-[60px] rounded-xl border-2 border-white/60 bg-white/70 backdrop-blur-sm px-3 py-2 text-sm text-charcoal placeholder:text-warm-gray/70 focus:border-slate focus:bg-white/90 focus:outline-none resize-none"
                      onBlur={(e) => saveExplanation(r.id, e.target.value)}
                    />
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span className="text-xs text-warm-gray">
                        Auto-saves when you click away
                      </span>
                      <button
                        onClick={() => unflag(r.id)}
                        className="min-h-[44px] px-3 text-xs text-slate hover:text-slate-dark hover:bg-slate/10 font-medium rounded-lg transition-colors"
                        aria-label={`Remove flag from transaction: ${r.description || 'no description'}`}
                      >
                        Remove flag
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CardContent>
    </Card>
  );
}
