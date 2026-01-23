'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/hooks/useDemo';

export default function DemoModeBanner() {
  const { isDemoMode, exitDemo } = useDemo();
  const [mounted, setMounted] = useState(false);

  // Wait for client-side hydration to avoid mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isDemoMode) return null;

  return (
    <div className="bg-warning/20 border-b border-warning/30 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-charcoal">
          <FlaskConical className="w-4 h-4 text-warning shrink-0" />
          <span>
            <strong>Demo Mode</strong> - Exploring with sample data. Changes
            won&apos;t be saved.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={exitDemo}
          className="shrink-0 h-7 px-2 text-charcoal hover:bg-warning/20"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Exit Demo</span>
        </Button>
      </div>
    </div>
  );
}
