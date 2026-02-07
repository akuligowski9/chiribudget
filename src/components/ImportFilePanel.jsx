'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, FileUp, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Papa from 'papaparse';
import ImportOptionsForm from '@/components/ImportOptionsForm';
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

export default function ImportFilePanel({ onSuccess }) {
  const t = useTranslations();
  const fileInputRef = useRef(null);
  const { profile, payerOptions } = useAuth();
  const { isDemoMode } = useDemo();
  const [toast, setToast] = useState(null);

  // Form state
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [bank, setBank] = useState('pnc');
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

  // Early validation state
  const [detectedPncFormat, setDetectedPncFormat] = useState(null);
  const [formatError, setFormatError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [rawCsvData, setRawCsvData] = useState(null); // Store for raw_payload

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

        // Parse all rows and track skip reasons
        const allRows = [];
        const fingerprintMap = new Map(); // fingerprint -> count

        for (let i = 0; i < csvData.length; i++) {
          const row = csvData[i];
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
          const rawDisplay = Object.values(row).slice(0, 4).join(' | ');

          // Check for various skip reasons
          let skipReason = null;

          if (
            mapping.isPncCredit &&
            shouldSkipPncCreditTransaction(description)
          ) {
            skipReason = 'Credit card payment';
          } else if (!dateStr) {
            skipReason = 'Missing date';
          } else if (amount === 0) {
            skipReason = 'Zero amount';
          }

          const txnDate = skipReason
            ? null
            : parseDate(dateStr, mapping.dateFormat, year);

          if (!skipReason && !txnDate) {
            skipReason = 'Invalid or pending date';
          }

          const baseFingerprint = txnDate
            ? computeFingerprint({
                household_id: profile?.household_id,
                currency,
                txn_date: txnDate,
                amount,
                description,
              })
            : null;

          // Debug: log fingerprint details for unemployment transactions
          if (description?.toLowerCase().includes('unemployment')) {
            // eslint-disable-next-line no-console
            console.log('Unemployment txn:', {
              txnDate,
              amount,
              description: description?.slice(0, 40),
              fingerprint: baseFingerprint,
            });
          }

          // Track in-file duplicates: flag instead of skip
          let fingerprint = baseFingerprint;
          let isDuplicate = false;
          if (!skipReason && baseFingerprint) {
            const count = fingerprintMap.get(baseFingerprint) || 0;
            fingerprintMap.set(baseFingerprint, count + 1);
            if (count > 0) {
              // Suffix fingerprint to satisfy DB unique constraint
              fingerprint = makeUniqueFingerprint(baseFingerprint, count + 1);
              isDuplicate = true;
            }
          }

          allRows.push({
            id: i,
            rawDisplay,
            txn_date: txnDate,
            description,
            amount,
            currency,
            skipReason,
            fingerprint,
            baseFingerprint,
            isDuplicate,
            excluded: !!skipReason, // Auto-exclude if there's a skip reason
            transaction: skipReason
              ? null
              : {
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
                  created_by: profile?.user_id,
                },
          });
        }

        // Retroactively flag the first occurrence of any duplicated fingerprint
        const duplicatedFingerprints = new Set(
          [...fingerprintMap.entries()]
            .filter(([, count]) => count > 1)
            .map(([fp]) => fp)
        );

        for (const row of allRows) {
          if (
            row.baseFingerprint &&
            duplicatedFingerprints.has(row.baseFingerprint) &&
            !row.isDuplicate &&
            !row.skipReason &&
            row.transaction
          ) {
            row.isDuplicate = true;
            row.transaction.is_flagged = true;
            row.transaction.flag_reason = 'possible_duplicate';
            row.transaction.flag_source = 'import';
          }
        }

        // Check for duplicates in database (skip in demo mode)
        if (!isDemoMode && profile?.household_id) {
          const fingerprints = allRows
            .filter((r) => r.fingerprint && !r.skipReason)
            .map((r) => r.fingerprint);

          if (fingerprints.length > 0) {
            const existingFingerprints = new Set();
            for (let i = 0; i < fingerprints.length; i += 100) {
              const batch = fingerprints.slice(i, i + 100);
              const { data } = await supabase
                .from('transactions')
                .select('fingerprint')
                .eq('household_id', profile.household_id)
                .in('fingerprint', batch);

              if (data) {
                data.forEach((row) =>
                  existingFingerprints.add(row.fingerprint)
                );
              }
            }

            // Mark DB duplicates
            allRows.forEach((row) => {
              if (
                row.fingerprint &&
                existingFingerprints.has(row.fingerprint) &&
                !row.skipReason
              ) {
                // eslint-disable-next-line no-console
                console.log('DB duplicate:', {
                  txnDate: row.txn_date,
                  amount: row.amount,
                  desc: row.description?.slice(0, 40),
                  fingerprint: row.fingerprint,
                });
                row.skipReason = 'Already imported';
                row.excluded = true;
              }
            });
          }
        }

        // Calculate counts
        const includedRows = allRows.filter((r) => !r.excluded);
        const skippedRows = allRows.filter((r) => r.excluded);
        const duplicateFlaggedCount = allRows.filter(
          (r) => r.isDuplicate && !r.excluded
        ).length;

        setAnalysisResult({
          allRows,
          newCount: includedRows.length,
          skippedCount: skippedRows.length,
          duplicateFlaggedCount,
          parsedTransactions: includedRows
            .map((r) => r.transaction)
            .filter(Boolean),
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

  // Toggle row exclusion
  function toggleRowExclusion(rowId) {
    if (!analysisResult) return;

    const updatedRows = analysisResult.allRows.map((row) =>
      row.id === rowId ? { ...row, excluded: !row.excluded } : row
    );

    const includedRows = updatedRows.filter((r) => !r.excluded);

    setAnalysisResult({
      ...analysisResult,
      allRows: updatedRows,
      newCount: includedRows.length,
      skippedCount: updatedRows.length - includedRows.length,
      parsedTransactions: includedRows
        .map((r) => r.transaction)
        .filter(Boolean),
    });
  }

  // Re-analyze when bank, year, or payer changes
  useEffect(() => {
    if (previewData?.rows && previewData.headers && file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          analyzeFile(results.data, results.meta.fields);
        },
      });
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
        setRawCsvData(results.data); // Store for raw_payload
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

    if (formatError) {
      setError(formatError);
      return;
    }

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
        resetForm();
        onSuccess?.();
        return;
      }

      const transactions = analysisResult.parsedTransactions;

      // Compute date range from transactions
      const dates = transactions.map((tx) => tx.txn_date).sort();
      const dateRangeStart = dates[0];
      const dateRangeEnd = dates[dates.length - 1];
      const month = dateRangeStart?.slice(0, 7) || `${year}-01`;

      const currency =
        transactions[0]?.currency || BANK_MAPPINGS[bank]?.currency || 'USD';

      // Create display name based on date range
      const bankLabel = BANKS.find((b) => b.value === bank)?.label || bank;
      const startDate = new Date(dateRangeStart + 'T00:00:00');
      const endDate = new Date(dateRangeEnd + 'T00:00:00');
      const startMonth = startDate.toLocaleString('en', { month: 'short' });
      const endMonth = endDate.toLocaleString('en', { month: 'short' });
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      let displayName;
      if (startYear === endYear && startMonth === endMonth) {
        // Same month: "PNC Bank Jan 2026"
        displayName = `${bankLabel} ${startMonth} ${startYear}`;
      } else if (startYear === endYear) {
        // Different months, same year: "PNC Bank Nov-Jan 2026"
        displayName = `${bankLabel} ${startMonth}-${endMonth} ${startYear}`;
      } else {
        // Different years: "PNC Bank Nov 2025 - Jan 2026"
        displayName = `${bankLabel} ${startMonth} ${startYear} - ${endMonth} ${endYear}`;
      }

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
          raw_payload: rawCsvData,
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

      // Batch insert transactions
      let insertedCount = 0;

      // eslint-disable-next-line no-console
      console.log(
        'Transactions to insert:',
        transactionsWithBatch.length,
        transactionsWithBatch[0]
      );

      for (let i = 0; i < transactionsWithBatch.length; i += 100) {
        const batch = transactionsWithBatch.slice(i, i + 100);
        const { data, error: insertError } = await supabase
          .from('transactions')
          .insert(batch)
          .select('id');

        if (insertError) {
          // eslint-disable-next-line no-console
          console.error(
            'Batch insert error:',
            insertError,
            'message:',
            insertError?.message,
            'details:',
            insertError?.details
          );
          for (const tx of batch) {
            const { error: singleError } = await supabase
              .from('transactions')
              .insert(tx);
            if (singleError) {
              // eslint-disable-next-line no-console
              console.error(
                'Single insert error:',
                singleError?.message,
                singleError?.details,
                'tx:',
                tx
              );
            } else {
              insertedCount++;
            }
          }
        } else {
          insertedCount += data?.length || batch.length;
        }
      }

      const skippedCount = analysisResult.skippedCount || 0;

      setToast({
        id: toastId(),
        type: 'success',
        title: t('unsorted.importSuccess'),
        message:
          t('unsorted.transactionsImported', { count: insertedCount }) +
          (skippedCount > 0 ? ` (${skippedCount} skipped)` : ''),
      });
      resetForm();
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

  function resetForm() {
    setFile(null);
    setPreviewData(null);
    setAnalysisResult(null);
    setDetectedPncFormat(null);
    setFormatError(null);
    setRawCsvData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      {/* File dropzone */}
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
        className="border-2 border-dashed border-stone/40 rounded-xl p-6 text-center cursor-pointer hover:border-slate/50 hover:bg-white/30 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <FileUp className="w-8 h-8 mx-auto text-warm-gray mb-2" />
        {file ? (
          <p className="text-charcoal font-medium">{file.name}</p>
        ) : (
          <>
            <p className="text-charcoal font-medium">
              {t('unsorted.dropOrClick')}
            </p>
            <p className="text-warm-gray text-sm mt-1">CSV files only</p>
          </>
        )}
      </div>

      {/* Preview and analysis */}
      {previewData && previewData.rows.length > 0 && (
        <div className="bg-white/50 rounded-lg p-3 text-xs space-y-3">
          {/* Header with format detection */}
          <div className="flex items-center justify-between">
            <p className="text-warm-gray font-medium">
              {previewData.totalRows} {t('unsorted.rowsFound')}
            </p>
            {bank === 'pnc' && detectedPncFormat && (
              <div className="flex items-center gap-1.5 text-success">
                <Check className="w-3.5 h-3.5" />
                <span>
                  {detectedPncFormat === 'credit' ? 'Credit Card' : 'Checking'}
                </span>
              </div>
            )}
          </div>

          {/* Analyzing spinner */}
          {analyzing && (
            <div className="flex items-center gap-1.5 text-warm-gray py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}

          {/* Transaction list with checkboxes */}
          {analysisResult && !analyzing && (
            <div className="space-y-2">
              {/* Summary */}
              <div className="flex items-center gap-3 text-sm pb-2 border-b border-white/60">
                <span className="text-charcoal font-medium">
                  {analysisResult.newCount} to import
                </span>
                {analysisResult.duplicateFlaggedCount > 0 && (
                  <span className="text-amber-600">
                    {analysisResult.duplicateFlaggedCount} duplicates flagged
                    for review
                  </span>
                )}
                {analysisResult.skippedCount > 0 && (
                  <span className="text-warm-gray">
                    {analysisResult.skippedCount} skipped
                  </span>
                )}
              </div>

              {/* Scrollable row list */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {analysisResult.allRows.map((row) => (
                  <label
                    key={row.id}
                    className={`flex items-start gap-2 p-1.5 rounded cursor-pointer hover:bg-white/50 ${
                      row.excluded ? 'opacity-60' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!row.excluded}
                      onChange={() => toggleRowExclusion(row.id)}
                      className="mt-0.5 rounded border-stone/40"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`truncate ${
                          row.excluded
                            ? 'line-through text-warm-gray'
                            : 'text-charcoal'
                        }`}
                      >
                        {row.rawDisplay}
                      </div>
                      {row.skipReason && (
                        <div className="text-amber-600 text-[10px] mt-0.5">
                          {row.skipReason}
                        </div>
                      )}
                      {!row.skipReason && row.isDuplicate && (
                        <div className="text-amber-600 text-[10px] mt-0.5">
                          Possible duplicate — flagged for review
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Format error */}
          {formatError && (
            <div className="flex items-start gap-1.5 text-error">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{formatError}</span>
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

      {/* Options */}
      <ImportOptionsForm
        bank={bank}
        onBankChange={setBank}
        year={year}
        onYearChange={setYear}
        defaultPayer={defaultPayer}
        onDefaultPayerChange={setDefaultPayer}
        payerOptions={payerOptions}
      />

      {/* Import button */}
      <Button
        onClick={handleSubmit}
        className="w-full"
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
