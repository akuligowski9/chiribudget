'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CollapsibleCard({
  className,
  defaultOpen = false,
  children,
  ...props
}) {
  return (
    <div
      className={cn('glass rounded-2xl overflow-hidden relative', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CollapsibleCardHeader({
  className,
  icon: Icon,
  title,
  description,
  isOpen,
  onToggle,
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full px-5 py-4 flex items-center justify-between text-left',
        'hover:bg-white/30 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2',
        className
      )}
      aria-expanded={isOpen}
      {...props}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate/10 to-slate/5">
            <Icon className="w-5 h-5 text-slate" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold tracking-tight text-charcoal">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-stone mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <ChevronDown
        className={cn(
          'w-5 h-5 text-slate transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
      />
    </button>
  );
}

export function CollapsibleCardContent({
  className,
  isOpen,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        'grid transition-all duration-200 ease-in-out',
        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="overflow-hidden">
        <div className={cn('px-5 pb-5', className)} {...props}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Hook for managing collapsible state
export function useCollapsible(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = () => setIsOpen((prev) => !prev);
  return { isOpen, toggle, setIsOpen };
}
