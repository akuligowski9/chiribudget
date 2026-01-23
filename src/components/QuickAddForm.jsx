'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { useOffline } from '@/contexts/OfflineContext';
import { useDemo } from '@/hooks/useDemo';
import {
  ALL_CATEGORIES,
  CURRENCIES,
  USD_THRESHOLD,
  FX_USD_TO_PEN,
} from '@/lib/categories';
import { shouldFlagNewTransaction } from '@/lib/categoryLimits';
import { getMaxAmount, MAX_DESCRIPTION_LENGTH } from '@/lib/constants';
import {
  addDemoTransaction,
  getAllDemoTransactions,
  getDemoCategoryLimits,
  getDemoThresholds,
} from '@/lib/demoStore';
import { normalizeDesc, toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import Toast from './Toast';

// Map category values to translation keys
const CATEGORY_KEYS = {
  'Fixed Expenses': 'fixedExpenses',
  'Rent/Mortgages': 'rentMortgages',
  Food: 'food',
  Dogs: 'dogs',
  'Holidays & Birthdays': 'holidaysBirthdays',
  Adventure: 'adventure',
  Unexpected: 'unexpected',
  Salary: 'salary',
  Investments: 'investments',
  Extra: 'extra',
};

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
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const {
    user,
    profile,
    payerOptions = [],
    categoryLimits: contextCategoryLimits = {},
  } = useAuth();
  const { isOffline, addTransaction: addOfflineTransaction } = useOffline();
  const [toast, setToast] = useState(null);

  const [txn_date, setTxnDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [currency, setCurrency] = useState('PEN');
  const [kind, setKind] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [payer, setPayer] = useState('');
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

  // Set default payer when options are loaded
  useEffect(() => {
    // Only set default when we have both profile and payerOptions
    if (payerOptions.length > 0 && profile?.display_name && !payer) {
      // Default to logged-in user's display name
      const userDisplayName = profile.display_name;
      const defaultPayer = payerOptions.includes(userDisplayName)
        ? userDisplayName
        : payerOptions[0];
      setPayer(defaultPayer);
    }
  }, [payerOptions, payer, profile?.display_name]);

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
      return t('errors.futureDateNotAllowed');
    }
    return null;
  };

  const validateAmount = (value, curr) => {
    if (!value || value.trim() === '') {
      return t('errors.amountRequired');
    }
    const num = Number(value);
    if (isNaN(num) || !Number.isFinite(num)) {
      return t('errors.invalidAmount');
    }
    if (num <= 0) {
      return t('errors.amountPositive');
    }
    const max = getMaxAmount(curr);
    if (num > max) {
      return t('errors.amountMax', {
        currency: curr,
        max: max.toLocaleString(),
      });
    }
    return null;
  };

  const validateDescription = (value) => {
    if (value && value.length > MAX_DESCRIPTION_LENGTH) {
      return t('errors.descriptionTooLong', { max: MAX_DESCRIPTION_LENGTH });
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
        title: t('errors.pleaseFixErrors'),
        message: t('errors.checkFieldsAbove'),
      });
      return;
    }

    if (!isDemoMode && !householdId) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('errors.setupRequired'),
        message: t('errors.createHouseholdFirst'),
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

    // Check threshold-based flagging
    const isOverThreshold = Math.abs(numericAmount) > thr;
    let shouldFlag = isOverThreshold;
    let flagReason = isOverThreshold
      ? numericAmount < 0
        ? 'over_threshold_expense'
        : 'over_threshold_income'
      : null;

    // Check category limit flagging (only for expenses)
    if (!shouldFlag && numericAmount < 0) {
      const categoryLimits = isDemoMode
        ? getDemoCategoryLimits()
        : contextCategoryLimits;

      if (categoryLimits && Object.keys(categoryLimits).length > 0) {
        // Get existing transactions for this month to calculate running totals
        const month = txn_date.slice(0, 7);
        let existingTransactions = [];

        if (isDemoMode) {
          const allDemo = getAllDemoTransactions();
          existingTransactions = allDemo.filter((t) =>
            (t.txn_date || '').startsWith(month)
          );
        }
        // Note: For authenticated mode, we rely on server-side flagging or
        // accept that first transaction won't have category limit check.
        // Full implementation would require fetching month transactions here.

        const newTxn = {
          amount: numericAmount,
          currency,
          category,
        };

        const { shouldFlag: flagForCategory, reason } =
          shouldFlagNewTransaction(
            newTxn,
            existingTransactions,
            categoryLimits,
            fxRate
          );

        if (flagForCategory) {
          shouldFlag = true;
          flagReason = reason;
        }
      }
    }

    const row = {
      household_id: householdId,
      txn_date,
      currency,
      description: description || null,
      amount: numericAmount,
      category,
      payer,
      is_flagged: shouldFlag,
      flag_reason: flagReason,
      source: 'manual',
      fingerprint,
      created_by: user?.id || '00000000-0000-0000-0000-000000000000',
    };

    if (isDemoMode) {
      // Add to demoStore so other components see the new transaction
      addDemoTransaction(row);
      setToast({
        id: toastId(),
        type: 'success',
        title: `${t('common.success')} (demo)`,
      });
      setAmount('');
      setDescription('');
      setCategory(kind === 'expense' ? 'Food' : 'Salary');
      setErrors({});
      onSuccess?.();
      return;
    }

    // If offline, use offline store
    if (isOffline) {
      try {
        await addOfflineTransaction(row);
        setToast({
          id: toastId(),
          type: 'success',
          title: t('common.savedOffline') || 'Saved offline',
          message:
            t('common.willSyncWhenOnline') || 'Will sync when back online',
        });
        setAmount('');
        setDescription('');
        setCategory(kind === 'expense' ? 'Food' : 'Salary');
        setErrors({});
        onSuccess?.();
      } catch (err) {
        setToast({
          id: toastId(),
          type: 'error',
          title: t('errors.somethingWentWrong'),
          message: err.message || 'Failed to save offline',
        });
      }
      return;
    }

    try {
      const { error } = await supabase.from('transactions').insert(row);
      if (error) throw error;

      setToast({ id: toastId(), type: 'success', title: t('common.success') });
      setAmount('');
      setDescription('');
      setCategory(kind === 'expense' ? 'Food' : 'Salary');
      setErrors({});
      onSuccess?.();
    } catch (err) {
      // If the error is network-related, try saving offline
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        try {
          await addOfflineTransaction(row);
          setToast({
            id: toastId(),
            type: 'success',
            title: t('common.savedOffline') || 'Saved offline',
            message:
              t('common.willSyncWhenOnline') || 'Will sync when back online',
          });
          setAmount('');
          setDescription('');
          setCategory(kind === 'expense' ? 'Food' : 'Salary');
          setErrors({});
          onSuccess?.();
          return;
        } catch {
          // Fall through to error handling
        }
      }
      await logError('save_transaction', err.message || 'Unknown error', row);
      setToast({
        id: toastId(),
        type: 'error',
        title: t('errors.somethingWentWrong'),
        message: t('errors.savedForReview'),
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="txn-date">{t('transaction.date')}</Label>
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
            <Label htmlFor="currency-select">{t('transaction.currency')}</Label>
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
            <Label id="type-label">{t('transaction.type')}</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger aria-labelledby="type-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">
                  {t('transaction.expense')}
                </SelectItem>
                <SelectItem value="income">
                  {t('transaction.income')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount-input">{t('transaction.amount')}</Label>
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
              {t('transaction.threshold')}: {currency} {thr} |{' '}
              {t('transaction.max')}: {currency} {maxAmount.toLocaleString()}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label id="category-label">{t('transaction.category')}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-labelledby="category-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`categories.${CATEGORY_KEYS[c]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label id="payer-label">{t('transaction.payer')}</Label>
          <Select value={payer} onValueChange={setPayer}>
            <SelectTrigger aria-labelledby="payer-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {payerOptions.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p === 'Together' ? t('payers.together') : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description-input">
            {t('transaction.descriptionOptional')}
          </Label>
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
          {t('transaction.saveTransaction')}
        </Button>
      </form>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
