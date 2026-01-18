import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-slate to-slate-light text-white shadow-lg shadow-slate/25 hover:shadow-xl hover:shadow-slate/30 hover:-translate-y-0.5 btn-glow',
        secondary: 'glass-strong text-charcoal hover:bg-white/90 shadow-md',
        outline:
          'border-2 border-slate/30 bg-white/50 backdrop-blur hover:border-slate hover:bg-white/70 text-charcoal',
        ghost: 'hover:bg-white/50 text-charcoal',
        income:
          'bg-gradient-to-r from-success to-emerald-500 text-white shadow-lg shadow-success/25',
        expense:
          'bg-gradient-to-r from-error to-rose-500 text-white shadow-lg shadow-error/25',
      },
      size: {
        default: 'h-11 px-5 py-2.5 text-sm',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = forwardRef(function Button(
  { className, variant, size, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

export { Button, buttonVariants };
