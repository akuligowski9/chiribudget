'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, Loader2, Upload, X } from 'lucide-react';
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
  computeFingerprint,
  detectPncFormat,
  parseAmount,
  parseDate,
  parsePncCheckingAmount,
  parsePncCreditAmount,
  shouldSkipPncCreditTransaction,
} from '@/lib/csvParserUtils';
import { toastId } from '@/lib/format';
import { makeUniqueFingerprint } from '@/lib/importUtils';
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
  const [importResults, _setImportResults] = useState(null);

  // Early validation state
  const [detectedPncFormat, setDetectedPncFormat] = useState(null); // 'credit' | 'checking'
  const [formatError, setFormatError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  // { total, newCount, dbDuplicates, fileDuplicates, parsedTransactions }

  // Analyze file for duplicates and validate format
  const analyzeFile = useCallback(
    async (csvData, headers) => {
      if (!csvData || csvData.length === 0) return;

      setAnalyzing(true);
      setFormatError(null);
      setDetectedPncFormat(null);
      setAnalysisResult(null);

      try {
        // Get mapping - auto-detect for PNC
        let mapping = BANK_MAPPINGS[bank];
        if (mapping?.isPnc) {
          const pncResult = detectPncFormat(headers);
          if (pncResult.error) {
            setFormatError(pncResult.error);
            setAnalyzing(false);
            return;
          }
          mapping = pncResult.mapping;
          setDetectedPncFormat(pncResult.format);
        }

        // Parse all transactions
        const transactions = [];
        const fingerprintMap = new Map(); // fingerprint -> count
        let fileDuplicateFlagged = 0;

        for (const row of csvData) {
          const dateKey = Object.keys(row).find(
            (k) => k.toLowerCase() === mapping.dateCol.toLowerCase()
          );
          const descKey = Object.keys(row).find(
            (k) => k.toLowerCase() === mapping.descriptionCol.toLowerCase()
          );

          let amount = 0;
          let currency = mapping.currency;

          if (mapping.isPncCredit) {
            const amountKey = Object.keys(row).find(
              (k) => k.toLowerCase() === mapping.amountCol.toLowerCase()
            );
            amount = parsePncCreditAmount(row[amountKey]);
          } else if (mapping.isPncChecking) {
            const amountKey = Object.keys(row).find(
              (k) => k.toLowerCase() === mapping.amountCol.toLowerCase()
            );
            amount = parsePncCheckingAmount(row[amountKey]);
          } else if (bank === 'interbank') {
            const penKey = Object.keys(row).find((k) => k.trim() === 'S/');
            const usdKey = Object.keys(row).find((k) => k.trim() === 'US$');
            const penAmount = parseAmount(row[penKey]);
            const usdAmount = parseAmount(row[usdKey]);
            if (usdAmount !== 0) {
              amount = -usdAmount;
              currency = 'USD';
            } else if (penAmount !== 0) {
              amount = -penAmount;
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

          // Skip PNC credit card payments
          if (
            mapping.isPncCredit &&
            shouldSkipPncCreditTransaction(description)
          ) {
            continue;
          }

          // Skip unparseable rows
          if (!dateStr || amount === 0) continue;

          const txnDate = parseDate(dateStr, mapping.dateFormat, year);
          if (!txnDate) continue;

          const baseFingerprint = computeFingerprint({
            household_id: profile?.household_id,
            currency,
            txn_date: txnDate,
            amount,
            description,
          });

          // Track in-file duplicates: flag instead of skip
          const count = fingerprintMap.get(baseFingerprint) || 0;
          fingerprintMap.set(baseFingerprint, count + 1);
          const isDuplicate = count > 0;
          const fingerprint = isDuplicate
            ? makeUniqueFingerprint(baseFingerprint, count + 1)
            : baseFingerprint;

          if (isDuplicate) fileDuplicateFlagged++;

          transactions.push({
            household_id: profile?.household_id,
            txn_date: txnDate,
            currency,
            description,
            amount,
            category: 'Unexpected',
            payer: defaultPayer,
            is_flagged: isDuplicate,
            flag_reason: isDuplicate ? 'possible_duplicate' : null,
            flag_source: isDuplicate ? 'import' : null,
            source: 'import',
            fingerprint,
            baseFingerprint,
            created_by: profile?.user_id,
          });
        }

        // Retroactively flag the first occurrence of any duplicated fingerprint
        const duplicatedFingerprints = new Set(
          [...fingerprintMap.entries()]
            .filter(([, c]) => c > 1)
            .map(([fp]) => fp)
        );

        for (const tx of transactions) {
          if (
            tx.baseFingerprint &&
            duplicatedFingerprints.has(tx.baseFingerprint) &&
            !tx.is_flagged
          ) {
            tx.is_flagged = true;
            tx.flag_reason = 'possible_duplicate';
            tx.flag_source = 'import';
            fileDuplicateFlagged++;
          }
        }

        // Remove baseFingerprint before sending to DB
        transactions.forEach((tx) => delete tx.baseFingerprint);

        // Check for duplicates in database (skip in demo mode)
        let dbDuplicates = 0;
        let newTransactions = transactions;

        if (!isDemoMode && transactions.length > 0 && profile?.household_id) {
          const fingerprints = transactions.map((t) => t.fingerprint);

          // Query in batches of 100 to avoid URL length limits
          const existingFingerprints = new Set();
          for (let i = 0; i < fingerprints.length; i += 100) {
            const batch = fingerprints.slice(i, i + 100);
            const { data } = await supabase
              .from('transactions')
              .select('fingerprint')
              .eq('household_id', profile.household_id)
              .in('fingerprint', batch);

            if (data) {
              data.forEach((row) => existingFingerprints.add(row.fingerprint));
            }
          }

          // Filter out existing transactions
          newTransactions = transactions.filter(
            (t) => !existingFingerprints.has(t.fingerprint)
          );
          dbDuplicates = transactions.length - newTransactions.length;
        }

        setAnalysisResult({
          total: transactions.length,
          newCount: newTransactions.length,
          dbDuplicates,
          fileDuplicateFlagged,
          parsedTransactions: newTransactions,
        });
      } catch (err) {
        setFormatError(err.message);
      } finally {
        setAnalyzing(false);
      }
    },
    [
      bank,
      year,
      profile?.household_id,
      profile?.user_id,
      defaultPayer,
      isDemoMode,
    ]
  );

  // Re-analyze when bank, year, or payer changes
  useEffect(() => {
    if (previewData?.rows && previewData.headers) {
      // Re-parse the full file when settings change
      if (file) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            analyzeFile(results.data, results.meta.fields);
          },
        });
      }
    }
  }, [bank, year, defaultPayer, analyzeFile, file, previewData]);

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
    setFormatError(null);
    setDetectedPncFormat(null);
    setAnalysisResult(null);

    // Parse CSV for preview and analysis
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData({
          headers: results.meta.fields || [],
          rows: results.data.slice(0, 5),
          totalRows: results.data.length,
        });
        // Trigger analysis
        analyzeFile(results.data, results.meta.fields);
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

    // Check for format errors
    if (formatError) {
      setError(formatError);
      return;
    }

    // Check if we have transactions to import
    if (!analysisResult?.parsedTransactions?.length) {
      setError(
        t('unsorted.noTransactionsFound') || 'No new transactions to import'
      );
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

      const transactions = analysisResult.parsedTransactions;

      // Compute date range from transactions
      const dates = transactions.map((tx) => tx.txn_date).sort();
      const dateRangeStart = dates[0];
      const dateRangeEnd = dates[dates.length - 1];
      const month = dateRangeStart?.slice(0, 7) || `${year}-01`;

      // Get currency from first transaction or mapping
      const currency =
        transactions[0]?.currency || BANK_MAPPINGS[bank]?.currency || 'USD';

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
          currency,
          month,
          source_bank: bank,
          default_payer: defaultPayer,
          txn_year: parseInt(year),
          date_range_start: dateRangeStart,
          date_range_end: dateRangeEnd,
          display_name: displayName,
          status: 'staged',
          created_by: profile?.user_id,
        })
        .select('id')
        .single();

      if (batchError) {
        throw new Error(batchError.message);
      }

      const batchId = batchData.id;

      // Add batch ID to all transactions
      const transactionsWithBatch = transactions.map((tx) => ({
        ...tx,
        import_batch_id: batchId,
      }));

      // Batch insert transactions (much faster than one-by-one)
      // Insert in chunks of 100 to avoid payload size limits
      let insertedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < transactionsWithBatch.length; i += 100) {
        const batch = transactionsWithBatch.slice(i, i + 100);
        const { data, error: insertError } = await supabase
          .from('transactions')
          .insert(batch)
          .select('id');

        if (insertError) {
          // If batch insert fails, try one-by-one for this batch
          // (handles case where some duplicates slipped through)
          for (const tx of batch) {
            const { error: singleError } = await supabase
              .from('transactions')
              .insert(tx);
            if (!singleError) {
              insertedCount++;
            }
          }
        } else {
          insertedCount += data?.length || batch.length;
        }
      }

      // Show results
      const skippedDbDupes = analysisResult.dbDuplicates;
      const flaggedDupes = analysisResult.fileDuplicateFlagged;

      let resultMessage = t('unsorted.transactionsImported', {
        count: insertedCount,
      });
      if (skippedDbDupes > 0) {
        resultMessage += ` (${skippedDbDupes} already imported)`;
      }
      if (flaggedDupes > 0) {
        resultMessage += ` (${flaggedDupes} duplicates flagged for review)`;
      }

      setToast({
        id: toastId(),
        type: 'success',
        title: t('unsorted.importSuccess'),
        message: resultMessage,
      });
      onSuccess?.();
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
            <div className="bg-white/50 rounded-lg p-3 text-xs overflow-x-auto space-y-3">
              <div>
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

              {/* Analysis results */}
              <div className="border-t border-white/60 pt-3 space-y-1.5">
                {/* PNC format detection */}
                {bank === 'pnc' && detectedPncFormat && (
                  <div className="flex items-center gap-1.5 text-success">
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      Detected:{' '}
                      {detectedPncFormat === 'credit'
                        ? 'Credit Card'
                        : 'Checking'}
                    </span>
                  </div>
                )}

                {/* Analyzing spinner */}
                {analyzing && (
                  <div className="flex items-center gap-1.5 text-warm-gray">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing for duplicates...</span>
                  </div>
                )}

                {/* Analysis complete */}
                {analysisResult && !analyzing && (
                  <>
                    <div className="flex items-center gap-1.5 text-charcoal">
                      <span className="font-medium">
                        {analysisResult.newCount} new transactions
                      </span>
                      {analysisResult.newCount === 0 && (
                        <span className="text-warm-gray">
                          (nothing to import)
                        </span>
                      )}
                    </div>

                    {analysisResult.dbDuplicates > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Copy className="w-3.5 h-3.5" />
                        <span>
                          {analysisResult.dbDuplicates} already imported (will
                          skip)
                        </span>
                      </div>
                    )}

                    {analysisResult.fileDuplicateFlagged > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Copy className="w-3.5 h-3.5" />
                        <span>
                          {analysisResult.fileDuplicateFlagged} duplicates
                          flagged for review
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Format error */}
                {formatError && (
                  <div className="flex items-start gap-1.5 text-error">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{formatError}</span>
                  </div>
                )}
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
                  disabled={
                    processing ||
                    !file ||
                    analyzing ||
                    !!formatError ||
                    (analysisResult && analysisResult.newCount === 0)
                  }
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
