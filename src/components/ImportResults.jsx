'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Import results component.
 * Shows success summary and unparseable rows.
 */
export default function ImportResults({ results }) {
  const t = useTranslations();

  if (!results) return null;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-success/10 rounded-lg p-3 text-sm">
        <p className="text-success font-medium">
          {t('unsorted.transactionsImported', {
            count: results.inserted,
          })}
          {results.duplicates > 0 && (
            <span className="text-warm-gray font-normal">
              {' '}
              (
              {t('import.duplicatesSkipped', {
                count: results.duplicates,
              })}
              )
            </span>
          )}
        </p>
      </div>

      {/* Unparseable rows */}
      {results.unparseable.length > 0 && (
        <div className="bg-warning/10 rounded-lg p-3">
          <p className="text-warning font-medium text-sm mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {t('unsorted.unparseableRows') || "Rows that couldn't be parsed"}
            <span className="text-warm-gray font-normal">
              ({results.unparseable.length})
            </span>
          </p>
          <p className="text-xs text-warm-gray mb-2">
            {t('unsorted.unparseableHelp') ||
              'You may need to add these manually'}
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {results.unparseable.map((row, i) => (
              <div key={i} className="bg-white/50 rounded p-2 text-xs">
                <div className="flex items-center gap-2 text-warm-gray mb-1">
                  <span className="font-medium">
                    {t('unsorted.row') || 'Row'} {row.rowNumber}
                  </span>
                  <span className="text-warning">
                    {row.reason === 'missing_date'
                      ? t('unsorted.missingDate') || 'Missing date'
                      : t('unsorted.zeroAmount') || 'Zero amount'}
                  </span>
                </div>
                <div className="text-charcoal truncate">{row.rawData}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
