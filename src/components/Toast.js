'use client';

import { useEffect } from 'react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose?.(toast.id), 3200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const bg = toast.type === 'error' ? '#fee2e2' : '#dcfce7';
  const border = toast.type === 'error' ? '#ef4444' : '#22c55e';

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        maxWidth: 360,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ fontWeight: 700 }}>{toast.title}</div>
      {toast.message && <div style={{ marginTop: 6 }}>{toast.message}</div>}
    </div>
  );
}
