'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { getDemoTransactions } from '@/lib/demoStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SkeletonTransactionList } from '@/components/ui/skeleton';
import { Flag, FlagOff, TrendingUp, TrendingDown } from 'lucide-react';
import Toast from './Toast';
import { toastId } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function TodayTransactions({ refreshKey }) {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setDemoMode(getDemoMode());
    loadTransactions();
  }, [refreshKey]);

  async function loadTransactions() {
    setLoading(true);

    if (getDemoMode()) {
      const month = today.slice(0, 7);
      const tx = getDemoTransactions({ month, currency: 'USD' }).filter(
        (t) => t.txn_date === today
      );
      setRows(tx);
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

    const { data: tx, error } = await supabase
      .from('transactions')
      .select(
        'id,txn_date,description,amount,currency,category,payer,is_flagged'
      )
      .eq('household_id', p.household_id)
      .eq('txn_date', today)
      .order('created_at', { ascending: false });

    if (!error) {
      setRows(tx || []);
    }
    setLoading(false);
  }

  async function toggleFlag(id, currentFlag) {
    if (demoMode) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_flagged: !currentFlag } : r))
      );
      setToast({
        id: toastId(),
        type: 'success',
        title: currentFlag ? 'Unflagged (demo)' : 'Flagged (demo)',
      });
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .update({ is_flagged: !currentFlag })
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
        prev.map((r) => (r.id === id ? { ...r, is_flagged: !currentFlag } : r))
      );
      setToast({
        id: toastId(),
        type: 'success',
        title: currentFlag ? 'Unflagged' : 'Flagged for review',
      });
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTransactionList rows={3} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate/10 to-slate/5 flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-slate/50" />
            </div>
            <p className="text-warm-gray text-sm">No transactions yet today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id || `${r.txn_date}-${r.amount}-${r.description}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group',
                  r.is_flagged
                    ? 'bg-gradient-to-r from-warning/15 to-warning/5 border border-warning/30'
                    : 'bg-white/40 border border-white/60 hover:bg-white/60 hover:shadow-sm'
                )}
              >
                {/* Amount indicator */}
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
                  <div className="font-semibold text-charcoal truncate text-sm">
                    {r.description || '(no description)'}
                  </div>
                  <div className="text-xs text-warm-gray mt-0.5">
                    {r.category} &middot; {r.payer}
                  </div>
                </div>

                <div
                  className={cn(
                    'font-bold whitespace-nowrap text-sm',
                    r.amount < 0 ? 'text-error' : 'text-success'
                  )}
                >
                  {r.amount < 0 ? '-' : '+'}
                  {r.currency} {Math.abs(Number(r.amount)).toFixed(2)}
                </div>

                <button
                  onClick={() => toggleFlag(r.id, r.is_flagged)}
                  title={r.is_flagged ? 'Remove flag' : 'Flag for review'}
                  className={cn(
                    'p-2 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100',
                    r.is_flagged
                      ? 'bg-warning/20 text-warning hover:bg-warning/30'
                      : 'bg-white/60 text-warm-gray hover:text-slate hover:bg-white'
                  )}
                >
                  {r.is_flagged ? (
                    <Flag className="w-4 h-4" fill="currentColor" />
                  ) : (
                    <FlagOff className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Card>
  );
}

function Plus(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
