'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import {
  ALL_CATEGORIES,
  CURRENCIES,
  PAYERS,
  USD_THRESHOLD,
  FX_USD_TO_PEN,
} from '@/lib/categories';
import { getMaxAmount, MAX_DESCRIPTION_LENGTH } from '@/lib/constants';
import { getDemoThresholds } from '@/lib/demoStore';
import { normalizeDesc, toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import Toast from './Toast';

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
  const { isDemoMode } = useDemo();
  const { user, profile } = useAuth();
  const [toast, setToast] = useState(null);

  const [txn_date, setTxnDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [currency, setCurrency] = useState('PEN');
  const [kind, setKind] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [payer, setPayer] = useState('Together');
  const [description, setDescription] = useState('');

  // Field-level validation errors
  const [errors, setErrors] = useState({});

  // Threshold values (fetched from settings or defaults)
  const [usdThreshold, setUsdThreshold] = useState(USD_THRESHOLD);
  const [fxRate, setFxRate] = useState(FX_USD_TO_PEN);

  // Get householdId from profile
  const householdId = profile?.household_id || null;

  // Load threshold settings
  useEffect(() => {
    if (isDemoMode) {
      const demoThresholds = getDemoThresholds();
      setUsdThreshold(demoThresholds.usdThreshold);
      setFxRate(demoThresholds.fxRate);
      return;
    }

    if (!householdId) return;

    async function loadThresholds() {
      const { data: config } = await supabase
        .from('budget_config')
        .select('usd_threshold, fx_usd_to_pen')
        .eq('household_id', householdId)
        .maybeSingle();

      if (config) {
        setUsdThreshold(config.usd_threshold);
        setFxRate(config.fx_usd_to_pen);
      }
    }

    loadThresholds();
  }, [isDemoMode, householdId]);

  // Set default currency from profile
  useEffect(() => {
    if (profile?.default_currency) {
      setCurrency(profile.default_currency);
    }
  }, [profile?.default_currency]);

  const thr = useMemo(
    () =>
      currency === 'USD' ? usdThreshold : Math.round(usdThreshold * fxRate),
    [currency, usdThreshold, fxRate]
  );
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

  const validateDescription = (value) => {
    if (value && value.length > MAX_DESCRIPTION_LENGTH) {
      return `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`;
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

  // Handle description change with validation
  const handleDescriptionChange = (e) => {
    const newDesc = e.target.value;
    setDescription(newDesc);
    const error = validateDescription(newDesc);
    setErrors((prev) => ({ ...prev, description: error }));
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
    const descriptionError = validateDescription(description);

    const newErrors = {
      date: dateError,
      amount: amountError,
      description: descriptionError,
    };

    setErrors(newErrors);

    // Check if there are any errors
    if (dateError || amountError || descriptionError) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Please fix errors',
        message: 'Check the highlighted fields above.',
      });
      return;
    }

    if (!isDemoMode && !householdId) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Setup required',
        message: 'Create or join a household first.',
      });
      return;
    }

    const fingerprint = isDemoMode
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

    if (isDemoMode) {
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
      <form
        onSubmit={onSubmit}
        className="space-y-4"
        aria-label="Add transaction form"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="txn-date">Date</Label>
            <Input
              id="txn-date"
              type="date"
              value={txn_date}
              onChange={handleDateChange}
              aria-invalid={errors.date ? 'true' : 'false'}
              aria-describedby={errors.date ? 'date-error' : undefined}
              className={
                errors.date
                  ? 'border-error focus:border-error focus:ring-error/20'
                  : ''
              }
            />
            {errors.date && (
              <p
                id="date-error"
                className="text-xs text-error mt-1"
                role="alert"
              >
                {errors.date}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency-select">Currency</Label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Select currency"
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
            <Label id="type-label">Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger aria-labelledby="type-label">
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
          <Label htmlFor="amount-input">Amount</Label>
          <Input
            id="amount-input"
            value={amount}
            onChange={handleAmountChange}
            inputMode="decimal"
            placeholder="e.g. 75.20"
            aria-invalid={errors.amount ? 'true' : 'false'}
            aria-describedby={errors.amount ? 'amount-error' : 'amount-hint'}
            className={
              errors.amount
                ? 'border-error focus:border-error focus:ring-error/20'
                : ''
            }
          />
          {errors.amount ? (
            <p
              id="amount-error"
              className="text-xs text-error mt-1"
              role="alert"
            >
              {errors.amount}
            </p>
          ) : (
            <p id="amount-hint" className="text-xs text-warm-gray">
              Threshold: {currency} {thr} | Max: {currency}{' '}
              {maxAmount.toLocaleString()}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label id="category-label">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-labelledby="category-label">
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
          <Label id="payer-label">Payer</Label>
          <Select value={payer} onValueChange={setPayer}>
            <SelectTrigger aria-labelledby="payer-label">
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
          <Label htmlFor="description-input">Description (optional)</Label>
          <Input
            id="description-input"
            value={description}
            onChange={handleDescriptionChange}
            maxLength={MAX_DESCRIPTION_LENGTH + 10}
            aria-invalid={errors.description ? 'true' : 'false'}
            aria-describedby={errors.description ? 'desc-error' : 'desc-hint'}
            className={
              errors.description
                ? 'border-error focus:border-error focus:ring-error/20'
                : ''
            }
          />
          {errors.description ? (
            <p id="desc-error" className="text-xs text-error mt-1" role="alert">
              {errors.description}
            </p>
          ) : (
            <p id="desc-hint" className="text-xs text-warm-gray">
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full mt-2">
          Save Transaction
        </Button>
      </form>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
