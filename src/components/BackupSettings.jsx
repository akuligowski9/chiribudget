'use client';

import { useState } from 'react';
import { Download, DatabaseBackup, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardContent,
  useCollapsible,
} from '@/components/ui/collapsible-card';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import {
  getAllDemoTransactions,
  getDemoThresholds,
  getDemoCategoryLimits,
} from '@/lib/demoStore';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import Toast from './Toast';

export default function BackupSettings() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const { isOpen, toggle } = useCollapsible(false);
  const [toast, setToast] = useState(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadBackup() {
    setDownloading(true);

    try {
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: {},
        rowCounts: {},
      };

      if (isDemoMode) {
        // Demo mode backup
        const transactions = getAllDemoTransactions();
        const thresholds = getDemoThresholds();
        const categoryLimits = getDemoCategoryLimits();

        backup.tables = {
          transactions,
          budget_config: [{ ...thresholds, category_limits: categoryLimits }],
        };
        backup.rowCounts = {
          transactions: transactions.length,
          budget_config: 1,
        };
      } else {
        // Real backup from Supabase
        const householdId = profile?.household_id;
        if (!householdId) {
          setToast({
            id: toastId(),
            type: 'error',
            title: t('backup.noHousehold'),
          });
          setDownloading(false);
          return;
        }

        const tables = [
          'households',
          'profiles',
          'transactions',
          'budget_config',
          'guidelines',
          'month_status',
          'import_batches',
        ];

        for (const table of tables) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('household_id', householdId);

          if (error) {
            console.error(`Error fetching ${table}:`, error);
            backup.tables[table] = { error: error.message };
            backup.rowCounts[table] = 0;
          } else {
            backup.tables[table] = data;
            backup.rowCounts[table] = data?.length || 0;
          }
        }

        // Also get household data (no household_id filter needed)
        const { data: householdData } = await supabase
          .from('households')
          .select('*')
          .eq('id', householdId)
          .single();

        if (householdData) {
          backup.tables.households = [householdData];
          backup.rowCounts.households = 1;
        }
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `chiribudget-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success with row counts
      const totalRows = Object.values(backup.rowCounts).reduce(
        (a, b) => a + b,
        0
      );
      setToast({
        id: toastId(),
        type: 'success',
        title: t('backup.downloadSuccess'),
        message: t('backup.rowCount', { count: totalRows }),
      });
    } catch (error) {
      console.error('Backup error:', error);
      setToast({
        id: toastId(),
        type: 'error',
        title: t('backup.downloadFailed'),
        message: error.message,
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <CollapsibleCard>
      <CollapsibleCardHeader
        icon={DatabaseBackup}
        title={t('backup.title')}
        description={t('backup.description')}
        isOpen={isOpen}
        onToggle={toggle}
      />
      <CollapsibleCardContent isOpen={isOpen}>
        <div className="space-y-4">
          <p className="text-sm text-warm-gray">{t('backup.help')}</p>

          <div className="bg-sage/10 rounded-lg p-3 text-sm">
            <p className="font-medium text-charcoal mb-1">
              {t('backup.includes')}
            </p>
            <ul className="text-warm-gray list-disc list-inside space-y-0.5">
              <li>{t('backup.includesTransactions')}</li>
              <li>{t('backup.includesConfig')}</li>
              <li>{t('backup.includesGuidelines')}</li>
              <li>{t('backup.includesDiscussions')}</li>
            </ul>
          </div>

          <Button onClick={handleDownloadBackup} disabled={downloading}>
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('backup.downloading')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t('backup.downloadButton')}
              </>
            )}
          </Button>

          <p className="text-xs text-warm-gray italic">
            {t('backup.autoBackupNote')}
          </p>
        </div>

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
