'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Papa from 'papaparse';
import Toast from '@/components/Toast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';

// Bank CSV column mappings
const BANK_MAPPINGS = {
  interbank: {
    dateCol: 'Fecha',
    descriptionCol: 'Descripción',
    amountCol: 'Monto',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  bcp: {
    dateCol: 'Fecha',
    descriptionCol: 'Descripcion',
    amountCol: 'Importe',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  bbva: {
    dateCol: 'Fecha',
    descriptionCol: 'Concepto',
    amountCol: 'Importe',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  scotiabank: {
    dateCol: 'Fecha',
    descriptionCol: 'Descripcion',
    amountCol: 'Monto',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  pnc: {
    dateCol: 'Date',
    descriptionCol: 'Description',
    amountCol: 'Amount',
    withdrawalCol: 'Withdrawals',
    depositCol: 'Deposits',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  },
  other: {
    dateCol: 'Date',
    descriptionCol: 'Description',
    amountCol: 'Amount',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  },
};

const BANKS = [
  { value: 'interbank', label: 'Interbank' },
  { value: 'bcp', label: 'BCP' },
  { value: 'bbva', label: 'BBVA' },
  { value: 'scotiabank', label: 'Scotiabank' },
  { value: 'pnc', label: 'PNC Bank' },
  { value: 'other', label: 'Other' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// Parse date string to YYYY-MM-DD format
function parseDate(dateStr, format, year) {
  if (!dateStr) return null;

  const cleanDate = dateStr.trim();
  let day, month, yearPart;

  if (format === 'DD/MM/YYYY') {
    const parts = cleanDate.split('/');
    if (parts.length >= 2) {
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      yearPart = parts[2] || year;
    }
  } else if (format === 'MM/DD/YYYY') {
    const parts = cleanDate.split('/');
    if (parts.length >= 2) {
      month = parts[0].padStart(2, '0');
      day = parts[1].padStart(2, '0');
      yearPart = parts[2] || year;
    }
  }

  if (day && month) {
    const fullYear =
      yearPart?.length === 2 ? `20${yearPart}` : yearPart || year;
    return `${fullYear}-${month}-${day}`;
  }

  return `${year}-01-01`; // Fallback
}

// Parse amount string to number
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = amountStr.toString().replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

// Generate fingerprint for deduplication
function generateFingerprint(
  householdId,
  currency,
  txnDate,
  amount,
  description
) {
  const base = `${householdId}|${currency}|${txnDate}|${Number(amount).toFixed(2)}|${(description || '').toLowerCase().trim()}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (h * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `fp_${h}`;
}

export default function ImportUpload({ onClose, onSuccess }) {
  const t = useTranslations();
  const fileInputRef = useRef(null);
  const { profile, payerOptions } = useAuth();
  const { isDemoMode } = useDemo();
  const [toast, setToast] = useState(null);

  // Form state
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [bank, setBank] = useState('interbank');
  const [defaultPayer, setDefaultPayer] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR.toString());

  // Set default payer when options are loaded
  useEffect(() => {
    if (payerOptions.length > 0 && !defaultPayer) {
      setDefaultPayer(payerOptions[0]);
    }
  }, [payerOptions, defaultPayer]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [importResults, setImportResults] = useState(null); // { inserted, duplicates, unparseable }

  // Handle file selection
  function handleFileChange(e) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError(t('unsorted.invalidFileType'));
      return;
    }

    // Validate file size (max 5MB for CSV)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError(t('unsorted.fileTooLarge'));
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData({
          headers: results.meta.fields || [],
          rows: results.data.slice(0, 5),
          totalRows: results.data.length,
        });
      },
      error: (err) => {
        setError(err.message);
      },
    });
  }

  // Process the upload
  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError(t('unsorted.noFileSelected'));
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      if (isDemoMode) {
        // Simulate processing in demo mode
        await new Promise((r) => setTimeout(r, 1000));
        setToast({
          id: toastId(),
          type: 'success',
          title: t('unsorted.importSuccess'),
          message: t('unsorted.demoImportMessage'),
        });
        onSuccess?.();
        return;
      }

      // Parse the full CSV
      const parseResult = await new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject,
        });
      });

      const mapping = BANK_MAPPINGS[bank];
      const transactions = [];
      const unparseable = [];

      for (let rowIndex = 0; rowIndex < parseResult.data.length; rowIndex++) {
        const row = parseResult.data[rowIndex];

        // Try to find date column (case-insensitive)
        const dateKey = Object.keys(row).find(
          (k) => k.toLowerCase() === mapping.dateCol.toLowerCase()
        );
        // Try to find description column
        const descKey = Object.keys(row).find(
          (k) => k.toLowerCase() === mapping.descriptionCol.toLowerCase()
        );

        // Try to find amount - handle PNC's separate columns
        let amount = 0;
        if (bank === 'pnc') {
          const withdrawalKey = Object.keys(row).find((k) =>
            k.toLowerCase().includes('withdrawal')
          );
          const depositKey = Object.keys(row).find((k) =>
            k.toLowerCase().includes('deposit')
          );
          const withdrawal = parseAmount(row[withdrawalKey]);
          const deposit = parseAmount(row[depositKey]);
          amount = deposit > 0 ? deposit : -Math.abs(withdrawal);
        } else {
          const amountKey = Object.keys(row).find(
            (k) => k.toLowerCase() === mapping.amountCol.toLowerCase()
          );
          amount = parseAmount(row[amountKey]);
        }

        const dateStr = row[dateKey];
        const description = row[descKey]?.trim() || '';

        // Track unparseable rows
        if (!dateStr || amount === 0) {
          // Only track if the row has some content (not completely empty)
          const hasContent = Object.values(row).some(
            (v) => v && v.toString().trim()
          );
          if (hasContent) {
            unparseable.push({
              rowNumber: rowIndex + 2, // +2 for header row and 1-based indexing
              reason: !dateStr ? 'missing_date' : 'zero_amount',
              rawData: Object.values(row).slice(0, 4).join(' | '),
            });
          }
          continue;
        }

        const txnDate = parseDate(dateStr, mapping.dateFormat, year);

        transactions.push({
          household_id: profile?.household_id,
          txn_date: txnDate,
          currency: mapping.currency,
          description,
          amount,
          category: 'Unexpected',
          payer: defaultPayer,
          is_flagged: false,
          source: 'import',
          status: 'pending',
          fingerprint: generateFingerprint(
            profile?.household_id,
            mapping.currency,
            txnDate,
            amount,
            description
          ),
        });
      }

      if (transactions.length === 0 && unparseable.length === 0) {
        throw new Error(
          t('unsorted.noTransactionsFound') || 'No transactions found in CSV'
        );
      }

      // Compute date range from transactions
      const dates = transactions.map((tx) => tx.txn_date).sort();
      const dateRangeStart = dates[0];
      const dateRangeEnd = dates[dates.length - 1];
      const month = dateRangeStart?.slice(0, 7) || `${year}-01`;

      // Create display name: "Bank Month Year" e.g. "Interbank Nov 2025"
      const bankLabel = BANKS.find((b) => b.value === bank)?.label || bank;
      const monthDate = new Date(month + '-01');
      const monthName = monthDate.toLocaleString('en', { month: 'short' });
      const displayName = `${bankLabel} ${monthName} ${year}`;

      // Create import batch record
      const { data: batchData, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          household_id: profile?.household_id,
          currency: mapping.currency,
          month,
          source_bank: bank,
          default_payer: defaultPayer,
          txn_year: parseInt(year),
          date_range_start: dateRangeStart,
          date_range_end: dateRangeEnd,
          display_name: displayName,
          raw_payload: parseResult.data,
          status: 'staged',
          created_by: profile?.user_id,
        })
        .select('id')
        .single();

      if (batchError) {
        throw new Error(batchError.message);
      }

      const batchId = batchData.id;

      // Insert transactions with batch ID (skip duplicates)
      let insertedCount = 0;
      let skippedCount = 0;

      for (const tx of transactions) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert({ ...tx, import_batch_id: batchId });

        if (txError) {
          if (txError.code === '23505') {
            // Duplicate fingerprint - skip
            skippedCount++;
          } else {
            // eslint-disable-next-line no-console
            console.error('Transaction insert error:', txError);
          }
        } else {
          insertedCount++;
        }
      }

      // Show results (keep modal open if there are unparseable rows)
      const results = {
        inserted: insertedCount,
        duplicates: skippedCount,
        unparseable,
      };

      if (unparseable.length > 0) {
        // Keep modal open to show unparseable rows
        setImportResults(results);
        setToast({
          id: toastId(),
          type: 'warning',
          title: t('unsorted.importPartial') || 'Import partially complete',
          message:
            t('unsorted.someRowsSkipped', { count: unparseable.length }) ||
            `${unparseable.length} rows couldn't be parsed`,
        });
      } else {
        // All rows parsed successfully
        setToast({
          id: toastId(),
          type: 'success',
          title: t('unsorted.importSuccess'),
          message:
            t('unsorted.transactionsImported', { count: insertedCount }) +
            (skippedCount > 0
              ? ` (${t('import.duplicatesSkipped', { count: skippedCount })})`
              : ''),
        });
        onSuccess?.();
      }
    } catch (e) {
      setError(e.message);
      setToast({
        id: toastId(),
        type: 'error',
        title: t('unsorted.importFailed'),
        message: e.message,
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cream rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/60">
          <h2 className="text-lg font-semibold text-charcoal flex items-center gap-2">
            <Upload className="w-5 h-5 text-slate" />
            {t('unsorted.importStatement')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-warm-gray" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* File upload area */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`
              relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
              transition-colors
              ${file ? 'border-success bg-success/5' : 'border-warm-gray/30 hover:border-accent hover:bg-accent/5'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="space-y-2">
                <FileSpreadsheet className="w-12 h-12 text-success mx-auto" />
                <p className="text-sm text-success font-medium">{file.name}</p>
                {previewData && (
                  <p className="text-xs text-warm-gray">
                    {previewData.totalRows}{' '}
                    {t('unsorted.rowsFound') || 'rows found'}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="w-12 h-12 text-warm-gray mx-auto opacity-50" />
                <p className="text-warm-gray">{t('unsorted.dropOrClick')}</p>
                <p className="text-xs text-warm-gray/70">
                  CSV {t('unsorted.filesOnly') || 'files only'}
                </p>
              </div>
            )}
          </div>

          {/* Preview - only show before import */}
          {previewData && previewData.rows.length > 0 && !importResults && (
            <div className="bg-white/50 rounded-lg p-3 text-xs overflow-x-auto">
              <p className="text-warm-gray mb-2 font-medium">
                {t('import.preview')}:
              </p>
              <div className="space-y-1">
                {previewData.rows.slice(0, 3).map((row, i) => (
                  <div key={i} className="text-charcoal truncate">
                    {Object.values(row).slice(0, 4).join(' | ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-success/10 rounded-lg p-3 text-sm">
                <p className="text-success font-medium">
                  {t('unsorted.transactionsImported', {
                    count: importResults.inserted,
                  })}
                  {importResults.duplicates > 0 && (
                    <span className="text-warm-gray font-normal">
                      {' '}
                      (
                      {t('import.duplicatesSkipped', {
                        count: importResults.duplicates,
                      })}
                      )
                    </span>
                  )}
                </p>
              </div>

              {/* Unparseable rows */}
              {importResults.unparseable.length > 0 && (
                <div className="bg-warning/10 rounded-lg p-3">
                  <p className="text-warning font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {t('unsorted.unparseableRows') ||
                      "Rows that couldn't be parsed"}
                    <span className="text-warm-gray font-normal">
                      ({importResults.unparseable.length})
                    </span>
                  </p>
                  <p className="text-xs text-warm-gray mb-2">
                    {t('unsorted.unparseableHelp') ||
                      'You may need to add these manually'}
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importResults.unparseable.map((row, i) => (
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
                        <div className="text-charcoal truncate">
                          {row.rawData}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error/10 rounded-lg text-error text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Options - hide after import */}
          {!importResults && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* Bank */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-warm-gray">
                    {t('unsorted.bank')}
                  </label>
                  <Select value={bank} onValueChange={setBank}>
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

                {/* Year */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-warm-gray">
                    {t('unsorted.year')}
                  </label>
                  <Select value={year} onValueChange={setYear}>
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
              </div>

              {/* Default payer */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-warm-gray">
                  {t('unsorted.defaultPayer')}
                </label>
                <Select value={defaultPayer} onValueChange={setDefaultPayer}>
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
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            {importResults ? (
              // After import - just show Done button
              <Button
                type="button"
                onClick={() => {
                  onSuccess?.();
                }}
                className="flex-1"
              >
                {t('common.close')}
              </Button>
            ) : (
              // Before import - show Cancel and Import
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={processing}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={processing || !file}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('unsorted.processing')}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {t('unsorted.importBtn')}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
