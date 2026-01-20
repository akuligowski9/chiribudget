'use client';

import { colors, styles } from '@/lib/theme';

/**
 * Preview component for the import panel.
 * Shows parsed transaction stats and a scrollable table preview.
 */
export default function ImportPreview({
  preview,
  currency,
  demoMode,
  onConfirm,
}) {
  if (!preview) return null;

  return (
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

      {/* Stats row */}
      <div style={{ fontSize: 14, color: colors.textSecondary }}>
        Month: <b style={{ color: colors.textPrimary }}>{preview.month}</b> •
        Currency: <b style={{ color: colors.textPrimary }}>{currency}</b> •
        Rows: <b style={{ color: colors.textPrimary }}>{preview.txns.length}</b>
      </div>
      <div style={{ marginTop: 6, fontSize: 14, color: colors.textSecondary }}>
        Income:{' '}
        <b style={{ color: colors.income }}>{preview.income.toFixed(2)}</b> •
        Expenses:{' '}
        <b style={{ color: colors.expense }}>{preview.expenses.toFixed(2)}</b> •
        Flagged: <b style={{ color: colors.warning }}>{preview.flaggedCount}</b>
      </div>

      {/* Transaction table */}
      <div
        style={{
          marginTop: 12,
          maxHeight: 180,
          overflowX: 'auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: colors.bgCard,
          borderRadius: 8,
          padding: 10,
        }}
      >
        <table
          style={{
            minWidth: 500,
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

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        style={{ ...styles.button, ...styles.buttonPrimary, marginTop: 14 }}
      >
        Confirm & {demoMode ? 'Simulate' : 'Save'}
      </button>
      {demoMode && (
        <div style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
          Demo mode does not persist data.
        </div>
      )}
    </div>
  );
}
