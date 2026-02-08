'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track container dimensions using ResizeObserver.
 * Prevents Recharts "width(-1) and height(-1)" warnings by only
 * returning ready=true when the container has valid positive dimensions.
 *
 * @returns {Object} { ref, width, height, ready }
 */
export function useContainerDimensions() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [node, setNode] = useState(null);

  // Callback ref to capture the DOM node
  const ref = useCallback((newNode) => {
    setNode(newNode);
  }, []);

  useEffect(() => {
    if (!node) return;

    // Initial measurement
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: rect.width, height: rect.height });
    }

    // Watch for resize
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node]);

  return {
    ref,
    width: dimensions.width,
    height: dimensions.height,
    ready: dimensions.width > 0 && dimensions.height > 0,
  };
}
