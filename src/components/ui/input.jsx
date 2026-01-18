import { cn } from '@/lib/utils';

export function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border border-stone/25 bg-white/90 backdrop-blur-sm px-4 py-2 text-sm text-charcoal placeholder:text-warm-gray/70 focus-visible:border-slate focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate/50 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        'text-sm font-semibold text-charcoal/80 tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'flex h-11 w-full rounded-xl border-2 border-white/60 bg-white/70 backdrop-blur-sm px-4 py-2 text-sm text-charcoal focus-visible:border-slate focus-visible:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate/50 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234A7C9B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-12 shadow-sm cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
