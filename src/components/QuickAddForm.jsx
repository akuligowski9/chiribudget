'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  ALL_CATEGORIES,
  CURRENCIES,
  PAYERS,
  USD_THRESHOLD,
  FX_USD_TO_PEN,
} from '@/lib/categories';
import { getDemoMode } from '@/lib/auth';
import { normalizeDesc, toastId } from '@/lib/format';
import { Input, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Toast from './Toast';

function thresholdFor(currency) {
  return currency === 'USD'
    ? USD_THRESHOLD
    : Math.round(USD_THRESHOLD * FX_USD_TO_PEN);
}

function computeFingerprint({
  household_id,
  currency,
  txn_date,
  amount,
  description,
}) {
  const base = `${household_id}|${currency}|${txn_date}|${Number(amount).toFixed(2)}|${normalizeDesc(description)}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return `fp_${h}`;
}

export default function QuickAddForm({ onSuccess }) {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);

  const [txn_date, setTxnDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [currency, setCurrency] = useState('USD');
  const [kind, setKind] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [payer, setPayer] = useState('together');
  const [description, setDescription] = useState('');

  const [householdId, setHouseholdId] = useState(null);

  useEffect(() => {
    setDemoMode(getDemoMode());
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      const { data: p } = await supabase
        .from('profiles')
        .select('household_id, default_currency')
        .eq('user_id', user.id)
        .maybeSingle();
      if (p?.household_id) setHouseholdId(p.household_id);
      if (p?.default_currency) setCurrency(p.default_currency);
    })();
  }, []);

  const thr = useMemo(() => thresholdFor(currency), [currency]);
  const numericAmount = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return 0;
    return kind === 'expense' ? -Math.abs(n) : Math.abs(n);
  }, [amount, kind]);

  async function logError(context, message, payload_snapshot) {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      await supabase.from('errors').insert({
        household_id: householdId,
        user_id: user?.id || null,
        context,
        message,
        payload_snapshot,
      });
    } catch {
      // swallow
    }
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Invalid amount',
        message: 'Enter a positive number.',
      });
      return;
    }

    if (!demoMode && !householdId) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Setup required',
        message: 'Create or join a household first.',
      });
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    const fingerprint = demoMode
      ? `demo_${Date.now()}`
      : computeFingerprint({
          household_id: householdId,
          currency,
          txn_date,
          amount: numericAmount,
          description,
        });

    const row = {
      household_id: householdId,
      txn_date,
      currency,
      description: description || null,
      amount: numericAmount,
      category,
      payer,
      is_flagged: Math.abs(numericAmount) > thr,
      flag_reason:
        Math.abs(numericAmount) > thr
          ? numericAmount < 0
            ? 'over_threshold_expense'
            : 'over_threshold_income'
          : null,
      source: 'manual',
      fingerprint,
      created_by: user?.id || '00000000-0000-0000-0000-000000000000',
    };

    if (demoMode) {
      setToast({ id: toastId(), type: 'success', title: 'Saved (demo)' });
      setAmount('');
      setDescription('');
      setCategory(kind === 'expense' ? 'Food' : 'Salary');
      onSuccess?.();
      return;
    }

    try {
      const { error } = await supabase.from('transactions').insert(row);
      if (error) throw error;

      setToast({ id: toastId(), type: 'success', title: 'Saved' });
      setAmount('');
      setDescription('');
      setCategory(kind === 'expense' ? 'Food' : 'Salary');
      onSuccess?.();
    } catch (err) {
      await logError('save_transaction', err.message || 'Unknown error', row);
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Something went wrong',
        message: "Don't worry — we saved this error for later review.",
      });
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={txn_date}
              onChange={(e) => setTxnDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Amount</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 75.20"
          />
          <p className="text-xs text-warm-gray">
            Threshold: {currency} {thr} (flagged items reviewed on Dashboard)
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Payer</Label>
          <Select value={payer} onChange={(e) => setPayer(e.target.value)}>
            {PAYERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full mt-2">
          Save Transaction
        </Button>
      </form>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
