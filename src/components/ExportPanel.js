'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { getDemoTransactions } from '@/lib/demoStore';
import { toCsv, downloadCsv } from '@/lib/csv';
import { CURRENCIES } from '@/lib/categories';
import Toast from './Toast';
import { toastId } from '@/lib/format';

export default function ExportPanel() {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);

  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [currency, setCurrency] = useState('USD');
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
        rows = getDemoTransactions({ month, currency });
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
        const { data, error } = await supabase
          .from('transactions')
          .select(
            'txn_date,description,amount,currency,category,payer,is_flagged,explanation,source'
          )
          .eq('household_id', householdId)
          .eq('currency', currency)
          .gte('txn_date', `${month}-01`)
          .lt('txn_date', `${month}-31`)
          .order('txn_date', { ascending: true });

        if (error) throw error;
        rows = data || [];
      }

      const headers = [
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
      downloadCsv(`ChiriBudget_${month}_${currency}.csv`, csv);

      setToast({
        id: toastId(),
        type: 'success',
        title: 'Exported ✅',
        message: `Downloaded ${rows.length} rows.`,
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
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <label>
          Month&nbsp;
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label>
          Currency&nbsp;
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={exportCsv}
          style={{ padding: '10px 12px', fontWeight: 700 }}
        >
          Download CSV
        </button>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
