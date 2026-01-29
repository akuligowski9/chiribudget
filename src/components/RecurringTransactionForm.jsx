'use client';

import { useState, useEffect } from 'react';
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
import { ALL_CATEGORIES, CURRENCIES } from '@/lib/categories';
import { getFrequencyOptions } from '@/lib/recurringUtils';
import { CATEGORY_KEYS } from '@/lib/transactionUtils';

/**
 * Form for creating/editing recurring transactions
 */
export default function RecurringTransactionForm({
  initialData = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const t = useTranslations();
  const { payerOptions = ['Partner 1', 'Partner 2', 'Together'] } = useAuth();
  const frequencyOptions = getFrequencyOptions();

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    type: 'expense', // expense or income
    category: 'Fixed Expenses',
    payer: payerOptions[0] || 'Partner 1',
    description: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    day_of_month: '',
    day_of_week: '',
  });

  const [errors, setErrors] = useState({});

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      const isIncome = Number(initialData.amount) > 0;
      setFormData({
        amount: String(Math.abs(Number(initialData.amount))),
        currency: initialData.currency || 'USD',
        type: isIncome ? 'income' : 'expense',
        category: initialData.category || 'Fixed Expenses',
        payer: initialData.payer || payerOptions[0] || 'Partner 1',
        description: initialData.description || '',
        frequency: initialData.frequency || 'monthly',
        start_date:
          initialData.start_date || new Date().toISOString().split('T')[0],
        end_date: initialData.end_date || '',
        day_of_month: initialData.day_of_month
          ? String(initialData.day_of_month)
          : '',
        day_of_week:
          initialData.day_of_week != null
            ? String(initialData.day_of_week)
            : '',
      });
    }
  }, [initialData, payerOptions]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (
      !formData.amount ||
      isNaN(Number(formData.amount)) ||
      Number(formData.amount) <= 0
    ) {
      newErrors.amount = t('recurring.errors.invalidAmount');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('recurring.errors.descriptionRequired');
    }

    if (!formData.start_date) {
      newErrors.start_date = t('recurring.errors.startDateRequired');
    }

    if (formData.end_date && formData.end_date < formData.start_date) {
      newErrors.end_date = t('recurring.errors.endDateBeforeStart');
    }

    if (formData.frequency === 'monthly' && formData.day_of_month) {
      const day = Number(formData.day_of_month);
      if (isNaN(day) || day < 1 || day > 31) {
        newErrors.day_of_month = t('recurring.errors.invalidDayOfMonth');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Calculate signed amount
    const absAmount = Number(formData.amount);
    const signedAmount = formData.type === 'expense' ? -absAmount : absAmount;

    const data = {
      amount: signedAmount,
      currency: formData.currency,
      category: formData.category,
      payer: formData.payer,
      description: formData.description.trim(),
      frequency: formData.frequency,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      day_of_month: formData.day_of_month
        ? Number(formData.day_of_month)
        : null,
      day_of_week:
        formData.day_of_week !== '' ? Number(formData.day_of_week) : null,
    };

    onSubmit(data);
  };

  const showDayOfMonth =
    formData.frequency === 'monthly' || formData.frequency === 'yearly';
  const showDayOfWeek =
    formData.frequency === 'weekly' || formData.frequency === 'biweekly';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount and Type Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">{t('recurring.amount')}</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            placeholder="0.00"
            className={errors.amount ? 'border-error' : ''}
          />
          {errors.amount && (
            <p className="text-xs text-error mt-1">{errors.amount}</p>
          )}
        </div>
        <div>
          <Label htmlFor="type">{t('recurring.type')}</Label>
          <Select
            value={formData.type}
            onValueChange={(v) => handleChange('type', v)}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">{t('recurring.expense')}</SelectItem>
              <SelectItem value="income">{t('recurring.income')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Currency and Category Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="currency">{t('recurring.currency')}</Label>
          <Select
            value={formData.currency}
            onValueChange={(v) => handleChange('currency', v)}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="category">{t('recurring.category')}</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => handleChange('category', v)}
          >
            <SelectTrigger id="category">
              <SelectValue>
                {formData.category &&
                  t(`categories.${CATEGORY_KEYS[formData.category]}`)}
              </SelectValue>
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
      </div>

      {/* Payer */}
      <div>
        <Label htmlFor="payer">{t('recurring.payer')}</Label>
        <Select
          value={formData.payer}
          onValueChange={(v) => handleChange('payer', v)}
        >
          <SelectTrigger id="payer">
            <SelectValue>
              {formData.payer === 'Together'
                ? t('payers.together')
                : formData.payer}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {payerOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p === 'Together' ? t('payers.together') : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">{t('recurring.description')}</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder={t('recurring.descriptionPlaceholder')}
          className={errors.description ? 'border-error' : ''}
        />
        {errors.description && (
          <p className="text-xs text-error mt-1">{errors.description}</p>
        )}
      </div>

      {/* Frequency */}
      <div>
        <Label htmlFor="frequency">{t('recurring.frequency.label')}</Label>
        <Select
          value={formData.frequency}
          onValueChange={(v) => handleChange('frequency', v)}
        >
          <SelectTrigger id="frequency">
            <SelectValue>
              {t(`recurring.frequency.${formData.frequency}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {frequencyOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Start and End Date Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="start_date">{t('recurring.startDate')}</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            className={errors.start_date ? 'border-error' : ''}
          />
          {errors.start_date && (
            <p className="text-xs text-error mt-1">{errors.start_date}</p>
          )}
        </div>
        <div>
          <Label htmlFor="end_date">{t('recurring.endDate')}</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            className={errors.end_date ? 'border-error' : ''}
          />
          {errors.end_date && (
            <p className="text-xs text-error mt-1">{errors.end_date}</p>
          )}
        </div>
      </div>

      {/* Day of Month (for monthly/yearly) */}
      {showDayOfMonth && (
        <div>
          <Label htmlFor="day_of_month">{t('recurring.dayOfMonth')}</Label>
          <Input
            id="day_of_month"
            type="number"
            min="1"
            max="31"
            value={formData.day_of_month}
            onChange={(e) => handleChange('day_of_month', e.target.value)}
            placeholder={t('recurring.dayOfMonthPlaceholder')}
            className={errors.day_of_month ? 'border-error' : ''}
          />
          {errors.day_of_month && (
            <p className="text-xs text-error mt-1">{errors.day_of_month}</p>
          )}
          <p className="text-xs text-warm-gray mt-1">
            {t('recurring.dayOfMonthHint')}
          </p>
        </div>
      )}

      {/* Day of Week (for weekly/biweekly) */}
      {showDayOfWeek && (
        <div>
          <Label htmlFor="day_of_week">{t('recurring.dayOfWeek')}</Label>
          <Select
            value={formData.day_of_week}
            onValueChange={(v) => handleChange('day_of_week', v)}
          >
            <SelectTrigger id="day_of_week">
              <SelectValue placeholder={t('recurring.selectDay')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t('days.sunday')}</SelectItem>
              <SelectItem value="1">{t('days.monday')}</SelectItem>
              <SelectItem value="2">{t('days.tuesday')}</SelectItem>
              <SelectItem value="3">{t('days.wednesday')}</SelectItem>
              <SelectItem value="4">{t('days.thursday')}</SelectItem>
              <SelectItem value="5">{t('days.friday')}</SelectItem>
              <SelectItem value="6">{t('days.saturday')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  );
}
