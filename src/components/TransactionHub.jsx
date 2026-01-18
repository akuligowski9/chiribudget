'use client';

import { useState } from 'react';
import { Download, Plus, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ExportPanel from './ExportPanel';
import ImportPanel from './ImportPanel';
import QuickAddForm from './QuickAddForm';

const TABS = [
  { id: 'quick', labelKey: 'transaction.quickAdd', icon: Plus },
  { id: 'import', labelKey: 'transaction.import', icon: Upload },
  { id: 'export', labelKey: 'transaction.export', icon: Download },
];

export default function TransactionHub({ onTransactionAdded }) {
  const t = useTranslations();
  const [tab, setTab] = useState('quick');

  return (
    <Card>
      <CardHeader>
        <CardTitle gradient>{t('transaction.addTransaction')}</CardTitle>
        <div className="flex gap-2 mt-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200',
                  tab === item.id
                    ? 'bg-gradient-to-r from-slate to-slate-light text-white shadow-md shadow-slate/20'
                    : 'bg-white text-charcoal hover:bg-sand/50 border border-stone/30 shadow-sm'
                )}
              >
                <Icon className="w-4 h-4" />
                {t(item.labelKey)}
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
