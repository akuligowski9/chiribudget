'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/**
 * Pagination controls for transaction list.
 */
export default function TransactionPagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
}) {
  const t = useTranslations();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center justify-between mt-4 pt-4 border-t border-white/40"
      aria-label="Transaction pagination"
    >
      <span className="text-sm text-warm-gray" aria-live="polite">
        {t('transaction.pageOfTotal', {
          current: page + 1,
          total: totalPages,
          count: totalCount,
        })}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          aria-label="Go to next page"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
