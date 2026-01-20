import { USD_THRESHOLD, FX_USD_TO_PEN } from '@/lib/categories';
import { normalizeDesc } from '@/lib/format';

/**
 * Get the flagging threshold for a given currency
 */
export function thresholdFor(currency) {
  return currency === 'USD'
    ? USD_THRESHOLD
    : Math.round(USD_THRESHOLD * FX_USD_TO_PEN);
}

/**
 * Compute a fingerprint for transaction deduplication
 */
export function computeFingerprint({
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

/**
 * Normalize imported transaction data from various JSON formats
 */
export function normalizeImported(raw, currencyFallback) {
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
