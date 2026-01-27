'use client';

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BANKS, YEARS } from '@/lib/csvParserUtils';

/**
 * Import options form component.
 * Shows bank selector, year selector, and default payer selector.
 */
export default function ImportOptionsForm({
  bank,
  onBankChange,
  year,
  onYearChange,
  defaultPayer,
  onDefaultPayerChange,
  payerOptions,
  hideYear = false,
}) {
  const t = useTranslations();

  // PNC dates include the year, so hide the year selector
  const showYear = !hideYear && bank !== 'pnc';

  return (
    <>
      <div className={showYear ? 'grid grid-cols-2 gap-3' : ''}>
        {/* Bank */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-warm-gray">
            {t('unsorted.bank')}
          </label>
          <Select value={bank} onValueChange={onBankChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BANKS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year - hidden for banks where dates include the year */}
        {showYear && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-warm-gray">
              {t('unsorted.year')}
            </label>
            <Select value={year} onValueChange={onYearChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Default payer */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-warm-gray">
          {t('unsorted.defaultPayer')}
        </label>
        <Select value={defaultPayer} onValueChange={onDefaultPayerChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {payerOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p === 'Together' ? t('payers.together') : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-warm-gray/70">
          {t('unsorted.defaultPayerHelp')}
        </p>
      </div>
    </>
  );
}
