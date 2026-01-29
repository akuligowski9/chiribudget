'use client';

import {
  TrendingUp,
  TrendingDown,
  Flag,
  Trash2,
  CloudOff,
  Repeat,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_CATEGORIES, CURRENCIES } from '@/lib/categories';
import { convertAmount } from '@/lib/currency';
import { CATEGORY_KEYS } from '@/lib/transactionUtils';
import { cn } from '@/lib/utils';

/**
 * Single transaction card with inline editing.
 */
export default function TransactionCard({
  transaction,
  currency,
  conversionRate,
  payerOptions,
  currentUserId,
  isDemoMode,
  isEditing,
  onEditStart,
  onEditEnd,
  onUpdate,
  onDelete,
}) {
  const t = useTranslations();
  const r = transaction;

  const convertedAmount = convertAmount(
    Number(r.amount),
    r.currency,
    currency,
    conversionRate
  );

  return (
    <div
      role="listitem"
      aria-label={`${r.description || 'No description'}, ${r.amount < 0 ? 'expense' : 'income'} of ${currency} ${Math.abs(convertedAmount).toFixed(2)}${r.currency !== currency ? ' (converted from ' + r.currency + ')' : ''}`}
      className={cn(
        'rounded-xl p-3 transition-all duration-200 group',
        r.is_flagged
          ? 'bg-gradient-to-r from-warning/15 to-warning/5 border border-warning/30'
          : 'bg-white/40 border border-white/60 hover:bg-white/60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Amount indicator */}
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
            r.amount < 0
              ? 'bg-gradient-to-br from-error/20 to-error/10 text-error'
              : 'bg-gradient-to-br from-success/20 to-success/10 text-success'
          )}
        >
          {r.amount < 0 ? (
            <TrendingDown className="w-5 h-5" />
          ) : (
            <TrendingUp className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            {/* Description */}
            <div className="flex-1">
              {isEditing ? (
                <Input
                  type="text"
                  defaultValue={r.description || ''}
                  onBlur={(e) => {
                    onUpdate(r.id, 'description', e.target.value);
                    onEditEnd();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onUpdate(r.id, 'description', e.target.value);
                      onEditEnd();
                    }
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="h-8 text-sm"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onEditStart(r.id)}
                  className={cn(
                    'text-sm font-semibold text-left hover:text-slate transition-colors',
                    r.description ? 'text-charcoal' : 'text-warm-gray'
                  )}
                  title={t('transaction.clickToEdit')}
                >
                  {r.description || t('transaction.noDescription')}
                </button>
              )}
              <div className="text-xs text-warm-gray mt-0.5">
                {r.txn_date}
                {r._syncStatus === 'pending' && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-warning">
                    <CloudOff className="w-3 h-3" aria-hidden="true" />
                    {t('common.pendingSync') || 'Pending sync'}
                  </span>
                )}
                {r.source === 'recurring' && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-slate">
                    <Repeat className="w-3 h-3" aria-hidden="true" />
                    {t('recurring.recurringSource')}
                  </span>
                )}
                {!isDemoMode && r.created_by && !r._syncStatus && (
                  <span className="ml-1.5">
                    •{' '}
                    {r.created_by === currentUserId
                      ? t('transaction.byYou')
                      : t('transaction.byPartner')}
                    {r.updated_at && r.updated_by && (
                      <span className="text-stone/60">
                        {' '}
                        ({t('transaction.edited')})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Amount - converted to display currency */}
            <div className="text-right">
              <div
                className={cn(
                  'font-bold text-sm whitespace-nowrap',
                  r.amount < 0 ? 'text-error' : 'text-success'
                )}
              >
                {r.currency !== currency && '≈'}
                {r.amount < 0 ? '-' : '+'}
                {currency} {Math.abs(convertedAmount).toFixed(2)}
              </div>
              {r.currency !== currency && (
                <div className="text-xs text-warm-gray">
                  ({r.currency} {Math.abs(Number(r.amount)).toFixed(2)})
                </div>
              )}
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={r.category}
              onValueChange={(value) => onUpdate(r.id, 'category', value)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
                <SelectValue>
                  {r.category && t(`categories.${CATEGORY_KEYS[r.category]}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ALL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {t(`categories.${CATEGORY_KEYS[c]}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={r.payer}
              onValueChange={(value) => onUpdate(r.id, 'payer', value)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs capitalize">
                <SelectValue>
                  {r.payer === 'Together' ? t('payers.together') : r.payer}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {payerOptions.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs capitalize">
                    {p === 'Together' ? t('payers.together') : p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={r.currency}
              onValueChange={(value) => onUpdate(r.id, 'currency', value)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[70px] text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() => onUpdate(r.id, 'is_flagged', !r.is_flagged)}
              className={cn(
                'h-8 px-2 rounded-lg border transition-all ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-1',
                r.is_flagged
                  ? 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30'
                  : 'bg-white/50 text-warm-gray border-white/60 hover:text-warning hover:bg-warning/10 opacity-60 group-hover:opacity-100'
              )}
              title={
                r.is_flagged
                  ? t('flags.removeFlag')
                  : t('flags.flagForDiscussion')
              }
              aria-label={
                r.is_flagged
                  ? t('flags.removeFlag')
                  : t('flags.flagForDiscussion')
              }
              aria-pressed={r.is_flagged}
            >
              <Flag
                className={cn('w-4 h-4', r.is_flagged && 'fill-current')}
                aria-hidden="true"
              />
            </button>

            <button
              onClick={() => onDelete(r.id)}
              className="h-8 px-2 rounded-lg bg-error/10 text-error hover:bg-error/20 border border-error/20 opacity-60 group-hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-1"
              aria-label="Delete this transaction"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
