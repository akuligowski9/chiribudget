'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { getDemoTransactions } from '@/lib/demoStore';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYERS,
} from '@/lib/categories';

function sum(list) {
  return list.reduce((s, x) => s + Number(x || 0), 0);
}

export default function DashboardCharts({ month, currency }) {
  const [demoMode, setDemoMode] = useState(false);
  const [householdId, setHouseholdId] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setDemoMode(getDemoMode());
    (async () => {
      if (getDemoMode()) {
        setRows(getDemoTransactions({ month, currency }));
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
        .select('txn_date,amount,category,payer,currency,is_flagged')
        .eq('household_id', p.household_id)
        .eq('currency', currency)
        .gte('txn_date', `${month}-01`)
        .lt('txn_date', `${month}-31`);

      if (!error) setRows(tx || []);
    })();
  }, [month, currency]);

  const incomeRows = rows.filter((r) => r.amount > 0);
  const expenseRows = rows.filter((r) => r.amount < 0);

  const incomeByCat = useMemo(() => {
    const m = Object.fromEntries(INCOME_CATEGORIES.map((c) => [c, 0]));
    for (const r of incomeRows)
      m[r.category] = (m[r.category] || 0) + Number(r.amount);
    return m;
  }, [incomeRows]);

  const expenseByCat = useMemo(() => {
    const m = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0]));
    for (const r of expenseRows)
      m[r.category] = (m[r.category] || 0) + Math.abs(Number(r.amount));
    return m;
  }, [expenseRows]);

  const netByPayer = useMemo(() => {
    const m = Object.fromEntries(PAYERS.map((p) => [p, 0]));
    for (const r of rows) m[r.payer] = (m[r.payer] || 0) + Number(r.amount);
    return m;
  }, [rows]);

  const totalIncome = sum(Object.values(incomeByCat));
  const totalExpenses = sum(Object.values(expenseByCat));
  const net = totalIncome - totalExpenses;

  return (
    <section
      style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}
    >
      <h2 style={{ marginTop: 0 }}>Month Summary</h2>
      {!demoMode && !householdId && (
        <p style={{ opacity: 0.8 }}>
          Log in and set up a household to see live data.
        </p>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <b>Total Income:</b> {currency} {totalIncome.toFixed(2)}
          </div>
          <div>
            <b>Total Expenses:</b> {currency} {totalExpenses.toFixed(2)}
          </div>
          <div>
            <b>Net:</b> {currency} {net.toFixed(2)}
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        >
          <div
            style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontWeight: 700 }}>Income by Category</div>
            {INCOME_CATEGORIES.map((c) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                }}
              >
                <span>{c}</span>
                <span>
                  {currency} {Number(incomeByCat[c] || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontWeight: 700 }}>Expenses by Category</div>
            {EXPENSE_CATEGORIES.map((c) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                }}
              >
                <span>{c}</span>
                <span>
                  {currency} {Number(expenseByCat[c] || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}
        >
          <div style={{ fontWeight: 700 }}>Saved / Lost (Net) by Payer</div>
          {PAYERS.map((p) => (
            <div
              key={p}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
              }}
            >
              <span>{p}</span>
              <span>
                {currency} {Number(netByPayer[p] || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
