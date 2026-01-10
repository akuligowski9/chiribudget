'use client';
import { useState } from 'react';
import QuickAddForm from './QuickAddForm';
import ImportPanel from './ImportPanel';
import ExportPanel from './ExportPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Plus, Upload, Download } from 'lucide-react';

const TABS = [
  { id: 'quick', label: 'Quick Add', icon: Plus },
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'export', label: 'Export', icon: Download },
];

export default function TransactionHub({ onTransactionAdded }) {
  const [tab, setTab] = useState('quick');

  return (
    <Card>
      <CardHeader>
        <CardTitle gradient>Add Transaction</CardTitle>
        <div className="flex gap-2 mt-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200',
                  tab === t.id
                    ? 'bg-gradient-to-r from-slate to-slate-light text-white shadow-md shadow-slate/20'
                    : 'bg-white/50 text-stone hover:bg-white/80 hover:text-charcoal border border-white/60'
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {tab === 'quick' && <QuickAddForm onSuccess={onTransactionAdded} />}
        {tab === 'import' && <ImportPanel />}
        {tab === 'export' && <ExportPanel />}
      </CardContent>
    </Card>
  );
}
