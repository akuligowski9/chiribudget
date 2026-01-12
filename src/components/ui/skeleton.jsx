'use client';

import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate/10', className)}
      {...props}
    />
  );
}

export function SkeletonText({ className, lines = 1, ...props }) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 p-4',
        className
      )}
      {...props}
    >
      <Skeleton className="h-5 w-1/3 mb-4" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonTransactionRow({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-white/40 border border-white/60',
        className
      )}
      {...props}
    >
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

export function SkeletonTransactionList({ rows = 3, className, ...props }) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTransactionRow key={i} />
      ))}
    </div>
  );
}
