'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { yyyyMm, normalizeDesc, toastId } from '@/lib/format';
import { colors, styles } from '@/lib/theme';
import Toast from './Toast';
import { CURRENCIES, USD_THRESHOLD, FX_USD_TO_PEN } from '@/lib/categories';

function thresholdFor(currency) {
  return currency === 'USD'
    ? USD_THRESHOLD
    : Math.round(USD_THRESHOLD * FX_USD_TO_PEN);
}

function computeFingerprint({
  household_id,
  currency,
  txn_date,
  amount,
  description,
}) {
  const base = `${household_id}|${currency}|${txn_date}|${Number(amount).toFixed(2)}|${normalizeDesc(description)}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return `fp_${h}`;
}

function normalizeImported(raw, currencyFallback) {
  const list = Array.isArray(raw) ? raw : raw?.transactions || [];
  return list
    .map((t) => {
      const txn_date = (t.txn_date || t.date || '').slice(0, 10);
      const currency = t.currency || currencyFallback || 'USD';
      const amount = Number(t.amount);
      return {
        txn_date,
        currency,
        amount: Number.isFinite(amount) ? amount : 0,
        description: t.description || t.memo || '',
        payer: t.payer || 'together',
        category: t.category || (amount < 0 ? 'Food' : 'Salary'),
      };
    })
    .filter((t) => t.txn_date && Number.isFinite(t.amount) && t.amount !== 0);
}

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

      // Insert may throw unique constraint errors if duplicates; that's OK.
      // We'll insert one-by-one for clarity in v1.
      let inserted = 0;
      for (const r of rows) {
        const { error } = await supabase.from('transactions').insert(r);
        if (!error) inserted++;
      }

      await supabase
        .from('import_batches')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', batch.id);

      setToast({
        id: toastId(),
        type: 'success',
        title: 'Import saved ✅',
        message: `Inserted ${inserted}/${rows.length} (duplicates skipped).`,
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
        message: 'Don’t worry — we saved this error for later review.',
      });
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={styles.label}>Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ ...styles.input, cursor: 'pointer' }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={parse}
          style={{ ...styles.button, ...styles.buttonSecondary }}
        >
          Parse JSON
        </button>
      </div>

      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder="Paste JSON export here..."
        style={{
          ...styles.input,
          width: '100%',
          minHeight: 180,
          marginTop: 14,
          resize: 'vertical',
        }}
      />

      {preview && (
        <div
          style={{
            marginTop: 16,
            background: colors.bgHover,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: colors.textPrimary,
              marginBottom: 10,
            }}
          >
            Import Preview
          </div>
          <div style={{ fontSize: 14, color: colors.textSecondary }}>
            Month: <b style={{ color: colors.textPrimary }}>{preview.month}</b>{' '}
            • Currency: <b style={{ color: colors.textPrimary }}>{currency}</b>{' '}
            • Rows:{' '}
            <b style={{ color: colors.textPrimary }}>{preview.txns.length}</b>
          </div>
          <div
            style={{ marginTop: 6, fontSize: 14, color: colors.textSecondary }}
          >
            Income:{' '}
            <b style={{ color: colors.income }}>{preview.income.toFixed(2)}</b>{' '}
            • Expenses:{' '}
            <b style={{ color: colors.expense }}>
              {preview.expenses.toFixed(2)}
            </b>{' '}
            • Flagged:{' '}
            <b style={{ color: colors.warning }}>{preview.flaggedCount}</b>
          </div>

          <div
            style={{
              marginTop: 12,
              maxHeight: 180,
              overflow: 'auto',
              background: colors.bgCard,
              borderRadius: 8,
              padding: 10,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ color: colors.textSecondary }}>
                  <th align="left" style={{ padding: '6px 8px' }}>
                    Date
                  </th>
                  <th align="left" style={{ padding: '6px 8px' }}>
                    Desc
                  </th>
                  <th align="right" style={{ padding: '6px 8px' }}>
                    Amt
                  </th>
                  <th align="left" style={{ padding: '6px 8px' }}>
                    Cur
                  </th>
                  <th align="left" style={{ padding: '6px 8px' }}>
                    Cat
                  </th>
                  <th align="left" style={{ padding: '6px 8px' }}>
                    Payer
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.txns.slice(0, 50).map((t, i) => (
                  <tr
                    key={i}
                    style={{ borderTop: `1px solid ${colors.borderLight}` }}
                  >
                    <td style={{ padding: '6px 8px', color: colors.textMuted }}>
                      {t.txn_date}
                    </td>
                    <td style={{ padding: '6px 8px' }}>{t.description}</td>
                    <td
                      align="right"
                      style={{
                        padding: '6px 8px',
                        fontWeight: 500,
                        color: t.amount < 0 ? colors.expense : colors.income,
                      }}
                    >
                      {t.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 8px', color: colors.textMuted }}>
                      {t.currency}
                    </td>
                    <td
                      style={{
                        padding: '6px 8px',
                        color: colors.textSecondary,
                      }}
                    >
                      {t.category}
                    </td>
                    <td
                      style={{
                        padding: '6px 8px',
                        color: colors.textSecondary,
                      }}
                    >
                      {t.payer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={confirm}
            style={{ ...styles.button, ...styles.buttonPrimary, marginTop: 14 }}
          >
            Confirm & {demoMode ? 'Simulate' : 'Save'}
          </button>
          {demoMode && (
            <div
              style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}
            >
              Demo mode does not persist data.
            </div>
          )}
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
