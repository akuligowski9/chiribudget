import { cn } from '@/lib/utils';

export function Card({ className, accent, ...props }) {
  return (
    <div
      className={cn(
        'glass rounded-2xl overflow-hidden relative',
        accent && 'accent-border',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('px-5 pt-5 pb-2', className)} {...props} />;
}

export function CardTitle({ className, gradient, children, ...props }) {
  return (
    <h3
      className={cn(
        'text-lg font-bold tracking-tight',
        gradient ? 'gradient-text' : 'text-charcoal',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}
