'use client';

import { CURRENCIES } from '@/lib/categories';
import { styles } from '@/lib/theme';

/**
 * JSON input component for the import panel.
 * Includes currency selector, textarea for JSON, and parse button.
 */
export default function ImportJsonInput({
  currency,
  onCurrencyChange,
  jsonText,
  onJsonTextChange,
  onParse,
}) {
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
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="w-24 h-10 px-3 text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 bg-gradient-to-r from-accent to-accent-light text-white border-2 border-accent/30 shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/35"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-white text-charcoal">
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={onParse}
          style={{ ...styles.button, ...styles.buttonSecondary }}
        >
          Parse JSON
        </button>
      </div>

      <textarea
        value={jsonText}
        onChange={(e) => onJsonTextChange(e.target.value)}
        placeholder="Paste JSON export here..."
        style={{
          ...styles.input,
          width: '100%',
          minHeight: 180,
          marginTop: 14,
          resize: 'vertical',
        }}
      />
    </div>
  );
}
