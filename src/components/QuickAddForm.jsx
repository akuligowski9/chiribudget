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
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Toast from './Toast';
import { getMaxAmount } from '@/lib/constants';

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

  // Field-level validation errors
  const [errors, setErrors] = useState({});

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
  const maxAmount = useMemo(() => getMaxAmount(currency), [currency]);
  const numericAmount = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return 0;
    return kind === 'expense' ? -Math.abs(n) : Math.abs(n);
  }, [amount, kind]);

  // Validation functions
  const validateDate = (date) => {
    const today = new Date().toISOString().slice(0, 10);
    if (date > today) {
      return 'Date cannot be in the future';
    }
    return null;
  };

  const validateAmount = (value, curr) => {
    if (!value || value.trim() === '') {
      return 'Amount is required';
    }
    const num = Number(value);
    if (isNaN(num) || !Number.isFinite(num)) {
      return 'Enter a valid number';
    }
    if (num <= 0) {
      return 'Amount must be greater than 0';
    }
    const max = getMaxAmount(curr);
    if (num > max) {
      return `Amount cannot exceed ${curr} ${max.toLocaleString()}`;
    }
    return null;
  };

  // Handle date change with validation
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setTxnDate(newDate);
    const error = validateDate(newDate);
    setErrors((prev) => ({ ...prev, date: error }));
  };

  // Handle amount change with validation
  const handleAmountChange = (e) => {
    const newAmount = e.target.value;
    setAmount(newAmount);
    // Only validate if user has entered something
    if (newAmount) {
      const error = validateAmount(newAmount, currency);
      setErrors((prev) => ({ ...prev, amount: error }));
    } else {
      setErrors((prev) => ({ ...prev, amount: null }));
    }
  };

  // Re-validate amount when currency changes (max limit changes)
  useEffect(() => {
    if (amount) {
      const error = validateAmount(amount, currency);
      setErrors((prev) => ({ ...prev, amount: error }));
    }
  }, [currency, amount]);

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

    // Validate all fields
    const dateError = validateDate(txn_date);
    const amountError = validateAmount(amount, currency);

    const newErrors = {
      date: dateError,
      amount: amountError,
    };

    setErrors(newErrors);

    // Check if there are any errors
    if (dateError || amountError) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Please fix errors',
        message: 'Check the highlighted fields above.',
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
      setErrors({});
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
      setErrors({});
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
              onChange={handleDateChange}
              className={
                errors.date
                  ? 'border-error focus:border-error focus:ring-error/20'
                  : ''
              }
            />
            {errors.date && (
              <p className="text-xs text-error mt-1">{errors.date}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Currency</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-10 px-3 text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 bg-gradient-to-r from-accent to-accent-light text-white border-2 border-accent/30 shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/35"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-white text-charcoal">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Amount</Label>
          <Input
            value={amount}
            onChange={handleAmountChange}
            inputMode="decimal"
            placeholder="e.g. 75.20"
            className={
              errors.amount
                ? 'border-error focus:border-error focus:ring-error/20'
                : ''
            }
          />
          {errors.amount ? (
            <p className="text-xs text-error mt-1">{errors.amount}</p>
          ) : (
            <p className="text-xs text-warm-gray">
              Threshold: {currency} {thr} | Max: {currency}{' '}
              {maxAmount.toLocaleString()}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
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
        </div>

        <div className="space-y-1.5">
          <Label>Payer</Label>
          <Select value={payer} onValueChange={setPayer}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYERS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
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
