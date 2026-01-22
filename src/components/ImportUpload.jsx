'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Papa from 'papaparse';
import ImportFileDropzone from '@/components/ImportFileDropzone';
import ImportOptionsForm from '@/components/ImportOptionsForm';
import ImportResults from '@/components/ImportResults';
import Toast from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import {
  BANK_MAPPINGS,
  BANKS,
  CURRENT_YEAR,
  generateFingerprint,
  parseAmount,
  parseDate,
} from '@/lib/csvParserUtils';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';

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
  const [importResults, setImportResults] = useState(null);

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
        const descKey = Object.keys(row).find(
          (k) => k.toLowerCase() === mapping.descriptionCol.toLowerCase()
        );

        // Try to find amount - handle bank-specific columns
        let amount = 0;
        let currency = mapping.currency;

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
        } else if (bank === 'interbank') {
          // Interbank has separate S/ and US$ columns
          const penKey = Object.keys(row).find((k) => k.trim() === 'S/');
          const usdKey = Object.keys(row).find((k) => k.trim() === 'US$');
          const penAmount = parseAmount(row[penKey]);
          const usdAmount = parseAmount(row[usdKey]);

          if (usdAmount !== 0) {
            amount = -Math.abs(usdAmount); // Credit card charges are negative
            currency = 'USD';
          } else if (penAmount !== 0) {
            amount = -Math.abs(penAmount); // Credit card charges are negative
            currency = 'PEN';
          }
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
          const hasContent = Object.values(row).some(
            (v) => v && v.toString().trim()
          );
          if (hasContent) {
            unparseable.push({
              rowNumber: rowIndex + 2,
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
          currency,
          description,
          amount,
          category: 'Unexpected',
          payer: defaultPayer,
          is_flagged: false,
          source: 'import',
          status: 'pending',
          fingerprint: generateFingerprint(
            profile?.household_id,
            currency,
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

      // Create display name
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
            skippedCount++;
          } else {
            // eslint-disable-next-line no-console
            console.error('Transaction insert error:', txError);
          }
        } else {
          insertedCount++;
        }
      }

      // Show results
      const results = {
        inserted: insertedCount,
        duplicates: skippedCount,
        unparseable,
      };

      if (unparseable.length > 0) {
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
          <ImportFileDropzone
            file={file}
            previewData={previewData}
            onFileChange={handleFileChange}
            inputRef={fileInputRef}
          />

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

          <ImportResults results={importResults} />

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error/10 rounded-lg text-error text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Options - hide after import */}
          {!importResults && (
            <ImportOptionsForm
              bank={bank}
              onBankChange={setBank}
              year={year}
              onYearChange={setYear}
              defaultPayer={defaultPayer}
              onDefaultPayerChange={setDefaultPayer}
              payerOptions={payerOptions}
            />
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            {importResults ? (
              <Button
                type="button"
                onClick={() => onSuccess?.()}
                className="flex-1"
              >
                {t('common.close')}
              </Button>
            ) : (
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
