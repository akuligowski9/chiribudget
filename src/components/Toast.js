'use client';

import { useEffect } from 'react';
import { TOAST_DURATION_MS } from '@/lib/constants';
import { colors } from '@/lib/theme';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose?.(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const border = isError ? colors.error + '30' : colors.success + '30';
  const textColor = isError ? colors.error : colors.success;

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        maxWidth: 340,
        background: colors.bgCard,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 4px 20px rgba(61, 56, 53, 0.12)',
      }}
    >
      <div style={{ fontWeight: 600, color: textColor }}>{toast.title}</div>
      {toast.message && (
        <div
          style={{ marginTop: 6, color: colors.textSecondary, fontSize: 14 }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
