'use client';

import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardContent,
  useCollapsible,
} from '@/components/ui/collapsible-card';
import { Input, Label } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { EXPENSE_CATEGORIES } from '@/lib/categories';
import { FLAG_MODES } from '@/lib/categoryLimits';
import { getDemoCategoryLimits, setDemoCategoryLimits } from '@/lib/demoStore';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import Toast from './Toast';

// Map category values to translation keys
const CATEGORY_KEYS = {
  'Fixed Expenses': 'fixedExpenses',
  'Rent/Mortgages': 'rentMortgages',
  Food: 'food',
  Dogs: 'dogs',
  'Holidays & Birthdays': 'holidaysBirthdays',
  Adventure: 'adventure',
  Unexpected: 'unexpected',
};

export default function CategoryLimitsSettings() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { categoryLimits: contextLimits, refreshCategoryLimits } = useAuth();
  const { isOpen, toggle } = useCollapsible(false);
  const [toast, setToast] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for editing
  const [limits, setLimits] = useState({});
  const [originalLimits, setOriginalLimits] = useState({});

  useEffect(() => {
    loadSettings();
  }, [isDemoMode]);

  // Sync with context when it changes
  useEffect(() => {
    if (!loading) {
      setLimits(contextLimits || {});
      setOriginalLimits(contextLimits || {});
    }
  }, [contextLimits, loading]);

  async function loadSettings() {
    setLoading(true);

    if (isDemoMode) {
      const demoLimits = getDemoCategoryLimits();
      setLimits(demoLimits);
      setOriginalLimits(demoLimits);
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: p } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!p?.household_id) {
      setLoading(false);
      return;
    }

    setHouseholdId(p.household_id);

    const { data: config } = await supabase
      .from('budget_config')
      .select('category_limits')
      .eq('household_id', p.household_id)
      .maybeSingle();

    const loadedLimits = config?.category_limits || {};
    setLimits(loadedLimits);
    setOriginalLimits(loadedLimits);

    setLoading(false);
  }

  function handleLimitChange(category, value) {
    const numValue = value === '' ? 0 : parseFloat(value);
    setLimits((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        limit: isNaN(numValue) ? 0 : numValue,
        flagMode: prev[category]?.flagMode || FLAG_MODES.OFF,
      },
    }));
  }

  function handleFlagModeChange(category, flagMode) {
    setLimits((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        limit: prev[category]?.limit || 0,
        flagMode,
      },
    }));
  }

  const hasChanges = JSON.stringify(limits) !== JSON.stringify(originalLimits);

  async function handleSave() {
    if (!hasChanges) {
      setToast({
        id: toastId(),
        type: 'success',
        title: t('settings.noChanges'),
      });
      return;
    }

    setSaving(true);

    // Clean up limits - remove entries with 0 limit
    const cleanedLimits = Object.fromEntries(
      Object.entries(limits).filter(
        ([, config]) => config?.limit && config.limit > 0
      )
    );

    if (isDemoMode) {
      setDemoCategoryLimits(cleanedLimits);
      setLimits(cleanedLimits);
      setOriginalLimits(cleanedLimits);
      refreshCategoryLimits();
      setSaving(false);
      setToast({
        id: toastId(),
        type: 'success',
        title: `${t('common.success')} (demo)`,
      });
      return;
    }

    if (!householdId) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('settings.noHousehold'),
        message: t('errors.createHouseholdFirst'),
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('budget_config')
      .upsert(
        { household_id: householdId, category_limits: cleanedLimits },
        { onConflict: 'household_id' }
      );

    if (error) {
      setSaving(false);
      setToast({
        id: toastId(),
        type: 'error',
        title: t('settings.saveFailed'),
        message: error.message,
      });
      return;
    }

    setLimits(cleanedLimits);
    setOriginalLimits(cleanedLimits);
    refreshCategoryLimits();
    setSaving(false);
    setToast({
      id: toastId(),
      type: 'success',
      title: t('settings.saved'),
    });
  }

  return (
    <>
      <CollapsibleCard>
        <CollapsibleCardHeader
          icon={Target}
          title={t('categoryLimits.title')}
          description={t('categoryLimits.description')}
          isOpen={isOpen}
          onToggle={toggle}
        />
        <CollapsibleCardContent isOpen={isOpen}>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-3">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-warm-gray">
                {t('categoryLimits.help')}
              </p>

              {EXPENSE_CATEGORIES.map((category) => {
                const config = limits[category] || {
                  limit: 0,
                  flagMode: FLAG_MODES.OFF,
                };
                return (
                  <div key={category} className="space-y-1.5">
                    <Label>{t(`categories.${CATEGORY_KEYS[category]}`)}</Label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={config.limit || ''}
                          onChange={(e) =>
                            handleLimitChange(category, e.target.value)
                          }
                          placeholder="0"
                          disabled={!isDemoMode && !householdId}
                          aria-label={`${t(`categories.${CATEGORY_KEYS[category]}`)} ${t('categoryLimits.limitLabel')}`}
                        />
                      </div>
                      <div className="w-40">
                        <Select
                          value={config.flagMode || FLAG_MODES.OFF}
                          onValueChange={(value) =>
                            handleFlagModeChange(category, value)
                          }
                          disabled={!isDemoMode && !householdId}
                        >
                          <SelectTrigger
                            aria-label={`${t(`categories.${CATEGORY_KEYS[category]}`)} ${t('categoryLimits.flagModeLabel')}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={FLAG_MODES.OFF}>
                              {t('categoryLimits.flagModeOff')}
                            </SelectItem>
                            <SelectItem value={FLAG_MODES.CROSSING}>
                              {t('categoryLimits.flagModeCrossing')}
                            </SelectItem>
                            <SelectItem value={FLAG_MODES.ALL_AFTER}>
                              {t('categoryLimits.flagModeAllAfter')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!isDemoMode && !householdId ? (
                <p className="text-xs text-warm-gray italic">
                  {t('settings.loginToCustomize')}
                </p>
              ) : (
                <Button onClick={handleSave} disabled={!hasChanges || saving}>
                  {saving ? t('settings.saving') : t('settings.saveSettings')}
                </Button>
              )}
            </div>
          )}

          <Toast toast={toast} onClose={() => setToast(null)} />
        </CollapsibleCardContent>
      </CollapsibleCard>
    </>
  );
}
