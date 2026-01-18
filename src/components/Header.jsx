'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';

export default function Header() {
  const { user, signOut } = useAuth();

  // Don't render header if not logged in (LoginScreen handles that)
  if (!user) return null;

  return (
    <Card accent className="p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate to-slate-light">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text leading-tight">
              ChiriBudget
            </h1>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-sm text-stone truncate max-w-[150px] hidden sm:block">
            {user.email}
          </span>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
