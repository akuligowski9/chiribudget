'use client';

import { useState, useRef } from 'react';
import { Download, Upload, DatabaseBackup, Loader2 } from 'lucide-react';
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
  setDemoTransactions,
  setDemoThresholds,
  setDemoCategoryLimits,
} from '@/lib/demoStore';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import Toast from './Toast';

// Tables to restore in order (respects foreign key dependencies)
const RESTORE_ORDER = [
  'budget_config',
  'month_status',
  'import_batches',
  'transactions',
];

export default function BackupSettings() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { profile, refreshProfile } = useAuth();
  const { isOpen, toggle } = useCollapsible(false);
  const [toast, setToast] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const fileInputRef = useRef(null);

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

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);

        // Validate backup structure
        if (!backup.timestamp || !backup.tables) {
          setToast({
            id: toastId(),
            type: 'error',
            title: t('backup.invalidFormat'),
          });
          return;
        }

        // Count rows to restore
        let totalRows = 0;
        const tableCounts = {};
        for (const table of RESTORE_ORDER) {
          const data = backup.tables[table];
          if (Array.isArray(data)) {
            tableCounts[table] = data.length;
            totalRows += data.length;
          }
        }

        // Show confirmation dialog
        setConfirmRestore({
          backup,
          timestamp: backup.timestamp,
          totalRows,
          tableCounts,
        });
      } catch {
        setToast({
          id: toastId(),
          type: 'error',
          title: t('backup.invalidFormat'),
        });
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  }

  async function handleConfirmRestore() {
    if (!confirmRestore) return;

    setRestoring(true);
    const { backup } = confirmRestore;

    try {
      if (isDemoMode) {
        // Demo mode restore
        if (backup.tables.transactions) {
          setDemoTransactions(backup.tables.transactions);
        }
        if (backup.tables.budget_config?.[0]) {
          const config = backup.tables.budget_config[0];
          if (config.usd_threshold !== undefined) {
            setDemoThresholds({
              usd_threshold: config.usd_threshold,
              fx_rate: config.fx_rate,
            });
          }
          if (config.category_limits) {
            setDemoCategoryLimits(config.category_limits);
          }
        }

        setToast({
          id: toastId(),
          type: 'success',
          title: t('backup.restoreSuccess'),
          message: t('backup.rowCount', { count: confirmRestore.totalRows }),
        });
      } else {
        // Real restore to Supabase
        const householdId = profile?.household_id;
        if (!householdId) {
          setToast({
            id: toastId(),
            type: 'error',
            title: t('backup.noHousehold'),
          });
          setRestoring(false);
          setConfirmRestore(null);
          return;
        }

        let restoredRows = 0;
        const errors = [];

        for (const table of RESTORE_ORDER) {
          const data = backup.tables[table];
          if (!Array.isArray(data) || data.length === 0) continue;

          // Filter to only restore data for the current household
          const filteredData = data.filter(
            (row) => row.household_id === householdId
          );

          if (filteredData.length === 0) continue;

          const { error } = await supabase
            .from(table)
            .upsert(filteredData, { onConflict: 'id' });

          if (error) {
            errors.push(`${table}: ${error.message}`);
          } else {
            restoredRows += filteredData.length;
          }
        }

        if (errors.length > 0) {
          setToast({
            id: toastId(),
            type: 'error',
            title: t('backup.restorePartial'),
            message: errors.join(', '),
          });
        } else {
          setToast({
            id: toastId(),
            type: 'success',
            title: t('backup.restoreSuccess'),
            message: t('backup.rowCount', { count: restoredRows }),
          });
        }

        // Refresh profile to pick up any config changes
        if (refreshProfile) {
          await refreshProfile();
        }
      }
    } catch (error) {
      console.error('Restore error:', error);
      setToast({
        id: toastId(),
        type: 'error',
        title: t('backup.restoreFailed'),
        message: error.message,
      });
    } finally {
      setRestoring(false);
      setConfirmRestore(null);
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

          <div className="flex gap-2 flex-wrap">
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

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
            >
              {restoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('backup.restoring')}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {t('backup.restoreButton')}
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-warm-gray italic">
            {t('backup.autoBackupNote')}
          </p>
        </div>

        {/* Restore Confirmation Dialog */}
        {confirmRestore && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-semibold text-charcoal mb-2">
                {t('backup.confirmRestoreTitle')}
              </h3>
              <p className="text-sm text-warm-gray mb-4">
                {t('backup.confirmRestoreMessage')}
              </p>

              <div className="bg-sage/10 rounded-lg p-3 mb-4 text-sm">
                <p className="font-medium text-charcoal mb-1">
                  {t('backup.backupDetails')}
                </p>
                <ul className="text-warm-gray space-y-0.5">
                  <li>
                    {t('backup.backupDate')}:{' '}
                    {new Date(confirmRestore.timestamp).toLocaleString()}
                  </li>
                  <li>
                    {t('backup.rowCount', { count: confirmRestore.totalRows })}
                  </li>
                </ul>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setConfirmRestore(null)}
                  disabled={restoring}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleConfirmRestore}
                  disabled={restoring}
                  className="bg-terracotta hover:bg-terracotta/90"
                >
                  {restoring ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('backup.restoring')}
                    </>
                  ) : (
                    t('backup.confirmRestore')
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
