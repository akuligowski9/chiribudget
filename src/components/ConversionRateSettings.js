'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardContent,
  useCollapsible,
} from '@/components/ui/collapsible-card';
import { Input, Label } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { FX_USD_TO_PEN } from '@/lib/categories';
import { getDemoThresholds, setDemoThresholds } from '@/lib/demoStore';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import Toast from './Toast';

export default function ConversionRateSettings() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { refreshConversionRate } = useAuth();
  const { isOpen, toggle } = useCollapsible(false);
  const [toast, setToast] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fxRate, setFxRate] = useState(FX_USD_TO_PEN);
  const [fxRateInput, setFxRateInput] = useState(String(FX_USD_TO_PEN));
  const [originalFxRate, setOriginalFxRate] = useState(FX_USD_TO_PEN);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    if (isDemoMode) {
      const demoThresholds = getDemoThresholds();
      setFxRate(demoThresholds.fxRate);
      setFxRateInput(String(demoThresholds.fxRate));
      setOriginalFxRate(demoThresholds.fxRate);
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
      .select('fx_usd_to_pen')
      .eq('household_id', p.household_id)
      .maybeSingle();

    if (config) {
      setFxRate(config.fx_usd_to_pen);
      setFxRateInput(String(config.fx_usd_to_pen));
      setOriginalFxRate(config.fx_usd_to_pen);
    }

    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function handleFxBlur() {
    const val = parseFloat(fxRateInput);
    if (isNaN(val) || fxRateInput.trim() === '' || val <= 0) {
      setFxRateInput(String(originalFxRate));
      setFxRate(originalFxRate);
    } else {
      setFxRate(val);
    }
  }

  const hasChanges = fxRate !== originalFxRate;

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

    if (isDemoMode) {
      const current = getDemoThresholds();
      setDemoThresholds({ ...current, fxRate });
      setOriginalFxRate(fxRate);
      setFxRateInput(String(fxRate));
      setSaving(false);
      setToast({
        id: toastId(),
        type: 'success',
        title: `${t('common.success')} (demo)`,
      });
      return;
    }

    if (!householdId) {
      setSaving(false);
      setToast({
        id: toastId(),
        type: 'error',
        title: t('settings.noHousehold'),
        message: t('errors.createHouseholdFirst'),
      });
      return;
    }

    const { error } = await supabase
      .from('budget_config')
      .upsert(
        { household_id: householdId, fx_usd_to_pen: fxRate },
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

    setOriginalFxRate(fxRate);
    setFxRateInput(String(fxRate));
    setSaving(false);
    refreshConversionRate();

    setToast({
      id: toastId(),
      type: 'success',
      title: t('settings.saved'),
    });
  }

  return (
    <CollapsibleCard>
      <CollapsibleCardHeader
        icon={ArrowRightLeft}
        title={t('settings.conversionRate')}
        description={t('settings.conversionRateDescription')}
        isOpen={isOpen}
        onToggle={toggle}
      />
      <CollapsibleCardContent isOpen={isOpen}>
        {loading ? (
          <div className="space-y-4 max-w-sm">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-11 w-28" />
          </div>
        ) : (
          <div className="space-y-4 max-w-sm">
            <div className="space-y-1.5">
              <Label>{t('settings.fxRate')}</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={fxRateInput}
                onChange={(e) => setFxRateInput(e.target.value)}
                onBlur={handleFxBlur}
                disabled={!isDemoMode && !householdId}
                placeholder="3.25"
              />
              <p className="text-xs text-warm-gray">
                {t('settings.oneUsdEquals', { rate: fxRateInput || '?' })}
              </p>
            </div>

            {!isDemoMode && !householdId ? (
              <p className="text-xs text-warm-gray italic">
                {t('settings.loginToCustomize')}
              </p>
            ) : (
              <Button onClick={handleSave} disabled={!hasChanges || saving}>
                {saving ? t('settings.saving') : t('common.save')}
              </Button>
            )}
          </div>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
