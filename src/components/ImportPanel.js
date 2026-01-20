'use client';

import { useEffect, useMemo, useState } from 'react';
import ImportJsonInput from '@/components/ImportJsonInput';
import ImportPreview from '@/components/ImportPreview';
import Toast from '@/components/Toast';
import { getDemoMode } from '@/lib/auth';
import { yyyyMm, toastId } from '@/lib/format';
import {
  thresholdFor,
  computeFingerprint,
  normalizeImported,
} from '@/lib/importUtils';
import { supabase } from '@/lib/supabaseClient';

export default function ImportPanel() {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);

  const [currency, setCurrency] = useState('USD');
  const [jsonText, setJsonText] = useState('');
  const [preview, setPreview] = useState(null);

  const [householdId, setHouseholdId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    setDemoMode(getDemoMode());
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      setUserId(user?.id || null);
      if (!user) return;

      const { data: p } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (p?.household_id) setHouseholdId(p.household_id);
    })();
  }, []);

  const thr = useMemo(() => thresholdFor(currency), [currency]);

  function parse() {
    try {
      const raw = JSON.parse(jsonText);
      const txns = normalizeImported(raw, currency);

      if (!txns.length) {
        setToast({
          id: toastId(),
          type: 'error',
          title: 'No transactions found',
          message: 'Expected an array or { transactions: [...] }.',
        });
        return;
      }

      const month = yyyyMm(txns[0].txn_date);
      const income = txns
        .filter((t) => t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);
      const expenses = txns
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const flaggedCount = txns.filter((t) => Math.abs(t.amount) > thr).length;

      setPreview({ month, txns, income, expenses, flaggedCount });
      setToast({
        id: toastId(),
        type: 'success',
        title: 'Parsed ✅',
        message: `Previewing ${txns.length} transactions.`,
      });
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Invalid JSON',
        message: e.message,
      });
    }
  }

  async function confirm() {
    if (!preview) return;
    if (demoMode) {
      setToast({
        id: toastId(),
        type: 'success',
        title: 'Demo mode',
        message: 'Import confirmed (demo) — nothing was saved.',
      });
      return;
    }
    if (!householdId || !userId) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Setup required',
        message: 'Log in and create/join a household first.',
      });
      return;
    }

    try {
      const batchPayload = {
        household_id: householdId,
        currency,
        month: preview.month,
        profile_key: null,
        raw_payload: JSON.parse(jsonText),
        parsed_preview: preview,
        status: 'staged',
        created_by: userId,
      };

      const { data: batch, error: batchErr } = await supabase
        .from('import_batches')
        .insert(batchPayload)
        .select('*')
        .single();
      if (batchErr) throw batchErr;

      const rows = preview.txns.map((t) => {
        const is_flagged = Math.abs(t.amount) > thresholdFor(t.currency);
        const fingerprint = computeFingerprint({
          household_id: householdId,
          currency: t.currency,
          txn_date: t.txn_date,
          amount: t.amount,
          description: t.description,
        });

        return {
          household_id: householdId,
          txn_date: t.txn_date,
          currency: t.currency,
          description: t.description || null,
          amount: t.amount,
          category: t.category,
          payer: t.payer,
          is_flagged,
          flag_reason: is_flagged
            ? t.amount < 0
              ? 'over_threshold_expense'
              : 'over_threshold_income'
            : null,
          source: 'import',
          import_batch_id: batch.id,
          fingerprint,
          created_by: userId,
        };
      });

      // Batch insert using RPC function for better performance and atomicity
      const { data: result, error: rpcError } = await supabase.rpc(
        'batch_insert_transactions',
        { p_transactions: rows }
      );

      if (rpcError) throw rpcError;

      const { inserted, skipped, failed_at, error: batchError } = result;

      if (batchError) {
        throw new Error(`Row ${failed_at}: ${batchError}`);
      }

      await supabase
        .from('import_batches')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', batch.id);

      setToast({
        id: toastId(),
        type: 'success',
        title: 'Import saved ✅',
        message: `Inserted ${inserted}/${rows.length}${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}.`,
      });
      setPreview(null);
      setJsonText('');
    } catch (e) {
      // error log best-effort
      try {
        await supabase.from('errors').insert({
          household_id: householdId,
          user_id: userId,
          context: 'confirm_import',
          message: e.message || 'Unknown error',
          payload_snapshot: { currency, preview },
        });
      } catch {}
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Something went wrong',
        message: "Don't worry — we saved this error for later review.",
      });
    }
  }

  return (
    <div>
      <ImportJsonInput
        currency={currency}
        onCurrencyChange={setCurrency}
        jsonText={jsonText}
        onJsonTextChange={setJsonText}
        onParse={parse}
      />

      <ImportPreview
        preview={preview}
        currency={currency}
        demoMode={demoMode}
        onConfirm={confirm}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
