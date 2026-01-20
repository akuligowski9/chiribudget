'use client';

import { Search, ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Search input and sort controls for transaction list.
 */
export default function TransactionSearchSort({
  searchQuery,
  onSearchChange,
  sortField,
  sortAsc,
  onToggleSort,
}) {
  const t = useTranslations();

  return (
    <>
      {/* Search input */}
      <div className="relative flex-1 max-w-xs">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-9"
          aria-label="Search transactions by description or category"
        />
      </div>

      {/* Sort controls */}
      <div
        className="flex gap-2 mt-3 w-full"
        role="group"
        aria-label="Sort transactions"
      >
        <Button
          variant={sortField === 'txn_date' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onToggleSort('txn_date')}
          className="text-xs"
          aria-pressed={sortField === 'txn_date'}
          aria-label={`Sort by date ${sortField === 'txn_date' ? (sortAsc ? 'ascending' : 'descending') : ''}`}
        >
          <ArrowUpDown className="w-3 h-3 mr-1" aria-hidden="true" />
          {t('transaction.date')}{' '}
          {sortField === 'txn_date' && (sortAsc ? '↑' : '↓')}
        </Button>
        <Button
          variant={sortField === 'amount' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onToggleSort('amount')}
          className="text-xs"
          aria-pressed={sortField === 'amount'}
          aria-label={`Sort by amount ${sortField === 'amount' ? (sortAsc ? 'ascending' : 'descending') : ''}`}
        >
          <ArrowUpDown className="w-3 h-3 mr-1" aria-hidden="true" />
          {t('transaction.amount')}{' '}
          {sortField === 'amount' && (sortAsc ? '↑' : '↓')}
        </Button>
      </div>
    </>
  );
}
