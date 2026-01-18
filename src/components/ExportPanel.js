'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDemoMode } from '@/lib/auth';
import { CURRENCIES } from '@/lib/categories';
import { toCsv, downloadCsv } from '@/lib/csv';
import { convertAmount } from '@/lib/currency';
import { getDemoTransactions } from '@/lib/demoStore';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import { styles } from '@/lib/theme';
import Toast from './Toast';

export default function ExportPanel() {
  const { conversionRate } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);

  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [currency, setCurrency] = useState('USD');
  const [convertAll, setConvertAll] = useState(false); // Convert all to display currency
  const [householdId, setHouseholdId] = useState(null);

  useEffect(() => {
    setDemoMode(getDemoMode());
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;
      const { data: p } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (p?.household_id) setHouseholdId(p.household_id);
    })();
  }, []);

  async function exportCsv() {
    try {
      let rows = [];

      if (demoMode) {
        if (convertAll) {
          // Get both currencies
          const usdTx = getDemoTransactions({ month, currency: 'USD' });
          const penTx = getDemoTransactions({ month, currency: 'PEN' });
          rows = [...usdTx, ...penTx];
        } else {
          rows = getDemoTransactions({ month, currency });
        }
      } else {
        if (!householdId) {
          setToast({
            id: toastId(),
            type: 'error',
            title: 'Setup required',
            message: 'Create/join a household first.',
          });
          return;
        }
        // Calculate first day of next month for proper date range
        const [year, mon] = month.split('-').map(Number);
        const nextMonth =
          mon === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(mon + 1).padStart(2, '0')}-01`;

        let query = supabase
          .from('transactions')
          .select(
            'txn_date,description,amount,currency,category,payer,is_flagged,explanation,source'
          )
          .eq('household_id', householdId)
          .gte('txn_date', `${month}-01`)
          .lt('txn_date', nextMonth)
          .is('deleted_at', null)
          .order('txn_date', { ascending: true });

        // Only filter by currency if not converting all
        if (!convertAll) {
          query = query.eq('currency', currency);
        }

        const { data, error } = await query;

        if (error) throw error;
        rows = data || [];
      }

      // Convert amounts if convertAll is true
      if (convertAll && rows.length > 0) {
        rows = rows.map((r) => ({
          ...r,
          original_currency: r.currency,
          original_amount: r.amount,
          amount: convertAmount(
            Number(r.amount),
            r.currency,
            currency,
            conversionRate
          ),
          currency: currency,
        }));
      }

      const headers = convertAll
        ? [
            'txn_date',
            'description',
            'amount',
            'currency',
            'original_amount',
            'original_currency',
            'category',
            'payer',
            'is_flagged',
            'explanation',
            'source',
          ]
        : [
            'txn_date',
            'description',
            'amount',
            'currency',
            'category',
            'payer',
            'is_flagged',
            'explanation',
            'source',
          ];
      const csv = toCsv(rows, headers);
      const suffix = convertAll ? '_converted' : '';
      downloadCsv(`ChiriBudget_${month}_${currency}${suffix}.csv`, csv);

      setToast({
        id: toastId(),
        type: 'success',
        title: 'Exported',
        message: `Downloaded ${rows.length} rows${convertAll ? ' (converted)' : ''}.`,
      });
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Export failed',
        message: e.message,
      });
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={styles.label}>Month</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={styles.input}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={styles.label}>Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-24 h-10 px-3 text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 bg-gradient-to-r from-accent to-accent-light text-white border-2 border-accent/30 shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/35"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-white text-charcoal">
                {c}
              </option>
            ))}
          </select>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={convertAll}
            onChange={(e) => setConvertAll(e.target.checked)}
            className="w-4 h-4 rounded border-warm-gray accent-accent"
          />
          <span style={{ ...styles.label, marginBottom: 0 }}>
            Convert all to {currency}
          </span>
        </label>
        <button
          onClick={exportCsv}
          style={{ ...styles.button, ...styles.buttonPrimary }}
        >
          Download CSV
        </button>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
