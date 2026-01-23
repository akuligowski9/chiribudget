'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to check if component has mounted (client-side).
 * Prevents hydration mismatches when using localStorage or other client-only APIs.
 *
 * @returns {boolean} true if component has mounted on client, false during SSR
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
