'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { getDemoTransactions } from '@/lib/demoStore';
import Toast from './Toast';
import { toastId } from '@/lib/format';

export default function FlaggedReview({ month, currency }) {
  const [demoMode, setDemoMode] = useState(false);
  const [_householdId, setHouseholdId] = useState(null);
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setDemoMode(getDemoMode());
    (async () => {
      if (getDemoMode()) {
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
        .gte('txn_date', `${month}-01`)
        .lt('txn_date', `${month}-31`)
        .eq('is_flagged', true)
        .order('txn_date', { ascending: true });

      if (!error) setRows(tx || []);
    })();
  }, [month, currency]);

  async function saveExplanation(id, explanation) {
    if (demoMode) {
      setToast({ id: toastId(), type: 'success', title: 'Saved (demo) ✅' });
      return;
    }
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ explanation })
        .eq('id', id);
      if (error) throw error;
      setToast({ id: toastId(), type: 'success', title: 'Saved ✅' });
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Save failed',
        message: e.message,
      });
    }
  }

  const unresolved = rows.filter(
    (r) => !(r.explanation && r.explanation.trim().length > 0)
  );

  return (
    <section
      style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}
    >
      <h2 style={{ marginTop: 0 }}>Flagged for Review</h2>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Transactions over the threshold appear here. Add explanations anytime.
      </p>
      <p style={{ marginTop: 6 }}>
        Unresolved: <b>{unresolved.length}</b> / {rows.length}
      </p>

      {rows.length === 0 ? (
        <p style={{ opacity: 0.8 }}>
          No flagged transactions for this month/currency.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((r) => (
            <div
              key={r.id || `${r.txn_date}-${r.amount}-${r.description}`}
              style={{
                border: '1px solid #eee',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <b>{r.txn_date}</b> — {r.description || '(no description)'}
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    {r.category} • {r.payer}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>
                  {r.currency} {Number(r.amount).toFixed(2)}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <textarea
                  defaultValue={r.explanation || ''}
                  placeholder="Add explanation (optional now, required before marking month Discussed)"
                  style={{ width: '100%', minHeight: 60, padding: 10 }}
                  onBlur={(e) => saveExplanation(r.id, e.target.value)}
                />
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  Saves on blur.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
