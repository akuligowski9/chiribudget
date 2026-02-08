'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sliders, Calculator } from 'lucide-react';
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
import { USD_THRESHOLD } from '@/lib/categories';
import {
  getDemoThresholds,
  setDemoThresholds,
  getThresholdChangePreview,
  applyThresholdChanges,
} from '@/lib/demoStore';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import ThresholdChangeModal from './ThresholdChangeModal';
import Toast from './Toast';

export default function BudgetSettings() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { conversionRate, refreshConversionRate } = useAuth();
  const { isOpen, toggle } = useCollapsible(false);
  const [toast, setToast] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [usdThreshold, setUsdThreshold] = useState(USD_THRESHOLD);
  const [usdThresholdInput, setUsdThresholdInput] = useState(
    String(USD_THRESHOLD)
  );
  const [originalUsdThreshold, setOriginalUsdThreshold] =
    useState(USD_THRESHOLD);

  // Get fxRate from context or demo store
  const [fxRate, setFxRate] = useState(conversionRate);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ toFlag: [], toUnflag: [] });

  const penThreshold = Math.round(usdThreshold * fxRate);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    if (isDemoMode) {
      const demoThresholds = getDemoThresholds();
      setUsdThreshold(demoThresholds.usdThreshold);
      setUsdThresholdInput(String(demoThresholds.usdThreshold));
      setOriginalUsdThreshold(demoThresholds.usdThreshold);
      setFxRate(demoThresholds.fxRate);
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
      .select('usd_threshold, fx_usd_to_pen')
      .eq('household_id', p.household_id)
      .maybeSingle();

    if (config) {
      setUsdThreshold(config.usd_threshold);
      setUsdThresholdInput(String(config.usd_threshold));
      setOriginalUsdThreshold(config.usd_threshold);
      setFxRate(config.fx_usd_to_pen);
    }

    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Keep fxRate in sync with context
  useEffect(() => {
    if (!isDemoMode) {
      setFxRate(conversionRate);
    }
  }, [conversionRate, isDemoMode]);

  function handleUsdBlur() {
    const val = parseFloat(usdThresholdInput);
    if (isNaN(val) || usdThresholdInput.trim() === '' || val <= 0) {
      setUsdThresholdInput(String(originalUsdThreshold));
      setUsdThreshold(originalUsdThreshold);
    } else {
      setUsdThreshold(val);
    }
  }

  const hasChanges = usdThreshold !== originalUsdThreshold;

  async function handleSaveClick() {
    if (!hasChanges) {
      setToast({
        id: toastId(),
        type: 'success',
        title: t('settings.noChanges'),
      });
      return;
    }

    if (isDemoMode) {
      const preview = getThresholdChangePreview({ usdThreshold, fxRate });
      setModalData(preview);
      setShowModal(true);
      return;
    }

    if (!householdId) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('settings.noHousehold'),
        message: t('errors.createHouseholdFirst'),
      });
      return;
    }

    const penThr = Math.round(usdThreshold * fxRate);

    const { data: toFlagUsd } = await supabase
      .from('transactions')
      .select('id, txn_date, description, amount, currency, flag_reason')
      .eq('household_id', householdId)
      .eq('currency', 'USD')
      .eq('is_flagged', false)
      .is('resolved_at', null)
      .or(`amount.gt.${usdThreshold},amount.lt.${-usdThreshold}`);

    const { data: toFlagPen } = await supabase
      .from('transactions')
      .select('id, txn_date, description, amount, currency, flag_reason')
      .eq('household_id', householdId)
      .eq('currency', 'PEN')
      .eq('is_flagged', false)
      .is('resolved_at', null)
      .or(`amount.gt.${penThr},amount.lt.${-penThr}`);

    const { data: toUnflagUsd } = await supabase
      .from('transactions')
      .select('id, txn_date, description, amount, currency, flag_reason')
      .eq('household_id', householdId)
      .eq('currency', 'USD')
      .eq('is_flagged', true)
      .is('resolved_at', null)
      .in('flag_reason', ['over_threshold_expense', 'over_threshold_income'])
      .gte('amount', -usdThreshold)
      .lte('amount', usdThreshold);

    const { data: toUnflagPen } = await supabase
      .from('transactions')
      .select('id, txn_date, description, amount, currency, flag_reason')
      .eq('household_id', householdId)
      .eq('currency', 'PEN')
      .eq('is_flagged', true)
      .is('resolved_at', null)
      .in('flag_reason', ['over_threshold_expense', 'over_threshold_income'])
      .gte('amount', -penThr)
      .lte('amount', penThr);

    const toFlag = [...(toFlagUsd || []), ...(toFlagPen || [])];
    const toUnflag = [...(toUnflagUsd || []), ...(toUnflagPen || [])];

    setModalData({ toFlag, toUnflag });
    setShowModal(true);
  }

  async function handleModalConfirm({ toFlagIds, toUnflagIds }) {
    setShowModal(false);
    setSaving(true);

    if (isDemoMode) {
      const current = getDemoThresholds();
      setDemoThresholds({ ...current, usdThreshold });
      const { flaggedCount, unflaggedCount } = applyThresholdChanges({
        toFlagIds,
        toUnflagIds,
      });
      setOriginalUsdThreshold(usdThreshold);
      setUsdThresholdInput(String(usdThreshold));
      setSaving(false);

      const messages = [];
      if (flaggedCount > 0)
        messages.push(t('settings.flagged', { count: flaggedCount }));
      if (unflaggedCount > 0)
        messages.push(t('settings.unflagged', { count: unflaggedCount }));

      setToast({
        id: toastId(),
        type: 'success',
        title: `${t('common.success')} (demo)`,
        message: messages.length > 0 ? messages.join(', ') : undefined,
      });
      return;
    }

    const { error } = await supabase
      .from('budget_config')
      .upsert(
        { household_id: householdId, usd_threshold: usdThreshold },
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

    let flaggedCount = 0;
    let unflaggedCount = 0;

    for (const id of toFlagIds) {
      const tx = modalData.toFlag.find((t) => t.id === id);
      const reason =
        tx && tx.amount > 0
          ? 'over_threshold_income'
          : 'over_threshold_expense';
      const { error: flagError } = await supabase
        .from('transactions')
        .update({ is_flagged: true, flag_reason: reason })
        .eq('id', id);
      if (!flagError) flaggedCount++;
    }

    for (const id of toUnflagIds) {
      const { error: unflagError } = await supabase
        .from('transactions')
        .update({ is_flagged: false, flag_reason: null })
        .eq('id', id);
      if (!unflagError) unflaggedCount++;
    }

    setOriginalUsdThreshold(usdThreshold);
    setUsdThresholdInput(String(usdThreshold));
    setSaving(false);
    refreshConversionRate();

    const messages = [];
    if (flaggedCount > 0)
      messages.push(t('settings.flagged', { count: flaggedCount }));
    if (unflaggedCount > 0)
      messages.push(t('settings.unflagged', { count: unflaggedCount }));

    setToast({
      id: toastId(),
      type: 'success',
      title: t('settings.saved'),
      message: messages.length > 0 ? messages.join(', ') : undefined,
    });
  }

  return (
    <>
      <CollapsibleCard>
        <CollapsibleCardHeader
          icon={Sliders}
          title={t('settings.budgetThresholds')}
          description={t('settings.thresholdsDescription')}
          isOpen={isOpen}
          onToggle={toggle}
        />
        <CollapsibleCardContent isOpen={isOpen}>
          {loading ? (
            <div className="space-y-4 max-w-sm">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-11 w-32" />
            </div>
          ) : (
            <div className="space-y-4 max-w-sm">
              {/* USD Threshold */}
              <div className="space-y-1.5">
                <Label>{t('settings.usdThreshold')}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={usdThresholdInput}
                  onChange={(e) => setUsdThresholdInput(e.target.value)}
                  onBlur={handleUsdBlur}
                  disabled={!isDemoMode && !householdId}
                  placeholder="500"
                />
                <p className="text-xs text-warm-gray">
                  {t('settings.thresholdHelp')}
                </p>
              </div>

              {/* Calculated PEN Threshold */}
              <div className="bg-gradient-to-r from-slate/10 to-slate/5 rounded-xl p-4 border border-slate/20">
                <div className="flex items-center gap-2 text-slate mb-1">
                  <Calculator className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {t('settings.penThreshold')}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate">
                  S/. {penThreshold.toLocaleString()}
                </div>
                <p className="text-xs text-warm-gray mt-1">
                  {t('settings.calculatedAs', {
                    usd: usdThreshold,
                    rate: fxRate,
                  })}
                </p>
              </div>

              {!isDemoMode && !householdId ? (
                <p className="text-xs text-warm-gray italic">
                  {t('settings.loginToCustomize')}
                </p>
              ) : (
                <Button
                  onClick={handleSaveClick}
                  disabled={!hasChanges || saving}
                >
                  {saving ? t('settings.saving') : t('settings.saveSettings')}
                </Button>
              )}
            </div>
          )}

          <Toast toast={toast} onClose={() => setToast(null)} />
        </CollapsibleCardContent>
      </CollapsibleCard>

      <ThresholdChangeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleModalConfirm}
        toFlag={modalData.toFlag}
        toUnflag={modalData.toUnflag}
        oldThreshold={originalUsdThreshold}
        newThreshold={usdThreshold}
        currency="USD"
      />
    </>
  );
}
