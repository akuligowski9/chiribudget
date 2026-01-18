'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FileUp, Home, MessageCircle, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', labelKey: 'nav.home', icon: Home },
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: BarChart3 },
  { href: '/unsorted', labelKey: 'nav.unsorted', icon: FileUp },
  { href: '/discussion', labelKey: 'nav.discussion', icon: MessageCircle },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export default function BottomNav() {
  const t = useTranslations();
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
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200',
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
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
