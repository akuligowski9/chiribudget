'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, BarChart3, MessageCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/discussion', label: 'Discuss', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();

  // Hide nav when not logged in and not in demo mode
  if (loading || (!user && !isDemoMode)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="max-w-md mx-auto glass-strong rounded-2xl shadow-lg shadow-black/10">
        <div className="flex justify-around items-center h-16 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2',
                  isActive ? 'text-slate' : 'text-warm-gray hover:text-stone'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-xl transition-all duration-200',
                    isActive &&
                      'bg-gradient-to-br from-slate to-slate-light text-white shadow-md shadow-slate/30'
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span
                  className={cn(
                    'text-[11px] font-semibold tracking-tight',
                    isActive && 'text-slate'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
