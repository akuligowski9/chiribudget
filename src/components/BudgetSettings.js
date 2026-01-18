'use client';

import { useEffect, useState } from 'react';
import { Sliders, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemo } from '@/hooks/useDemo';
import { USD_THRESHOLD, FX_USD_TO_PEN } from '@/lib/categories';
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
  const { isDemoMode } = useDemo();
  const [toast, setToast] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [usdThreshold, setUsdThreshold] = useState(USD_THRESHOLD);
  const [fxRate, setFxRate] = useState(FX_USD_TO_PEN);

  // String values for inputs (allows empty field while typing)
  const [usdThresholdInput, setUsdThresholdInput] = useState(
    String(USD_THRESHOLD)
  );
  const [fxRateInput, setFxRateInput] = useState(String(FX_USD_TO_PEN));

  const [originalUsdThreshold, setOriginalUsdThreshold] =
    useState(USD_THRESHOLD);
  const [originalFxRate, setOriginalFxRate] = useState(FX_USD_TO_PEN);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ toFlag: [], toUnflag: [] });

  const penThreshold = Math.round(usdThreshold * fxRate);

  useEffect(() => {
    loadSettings();
  }, [isDemoMode]);

  async function loadSettings() {
    setLoading(true);

    if (isDemoMode) {
      const demoThresholds = getDemoThresholds();
      setUsdThreshold(demoThresholds.usdThreshold);
      setUsdThresholdInput(String(demoThresholds.usdThreshold));
      setOriginalUsdThreshold(demoThresholds.usdThreshold);
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
      .select('usd_threshold, fx_usd_to_pen')
      .eq('household_id', p.household_id)
      .maybeSingle();

    if (config) {
      setUsdThreshold(config.usd_threshold);
      setUsdThresholdInput(String(config.usd_threshold));
      setOriginalUsdThreshold(config.usd_threshold);
      setFxRate(config.fx_usd_to_pen);
      setFxRateInput(String(config.fx_usd_to_pen));
      setOriginalFxRate(config.fx_usd_to_pen);
    }

    setLoading(false);
  }

  // Handle input blur - revert to original if empty/invalid
  function handleUsdBlur() {
    const val = parseFloat(usdThresholdInput);
    if (isNaN(val) || usdThresholdInput.trim() === '') {
      setUsdThresholdInput(String(originalUsdThreshold));
      setUsdThreshold(originalUsdThreshold);
    } else {
      setUsdThreshold(val);
    }
  }

  function handleFxBlur() {
    const val = parseFloat(fxRateInput);
    if (isNaN(val) || fxRateInput.trim() === '') {
      setFxRateInput(String(originalFxRate));
      setFxRate(originalFxRate);
    } else {
      setFxRate(val);
    }
  }

  const hasChanges =
    usdThreshold !== originalUsdThreshold || fxRate !== originalFxRate;

  // Preview changes before saving
  async function handleSaveClick() {
    if (!hasChanges) {
      setToast({ id: toastId(), type: 'success', title: 'No changes to save' });
      return;
    }

    if (isDemoMode) {
      // Get preview of affected transactions
      const preview = getThresholdChangePreview({ usdThreshold, fxRate });
      setModalData(preview);
      setShowModal(true);
      return;
    }

    if (!householdId) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'No household',
        message: 'Create or join a household first.',
      });
      return;
    }

    // For real mode, get preview from database
    const penThr = Math.round(usdThreshold * fxRate);

    // Get transactions to flag (over threshold, not flagged, not resolved)
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

    // Get transactions to unflag (under threshold, flagged due to threshold, not resolved)
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

  // Apply changes after modal confirmation
  async function handleModalConfirm({ toFlagIds, toUnflagIds }) {
    setShowModal(false);
    setSaving(true);

    if (isDemoMode) {
      // Save demo thresholds
      setDemoThresholds({ usdThreshold, fxRate });
      // Apply flag/unflag changes
      const { flaggedCount, unflaggedCount } = applyThresholdChanges({
        toFlagIds,
        toUnflagIds,
      });
      setOriginalUsdThreshold(usdThreshold);
      setOriginalFxRate(fxRate);
      setUsdThresholdInput(String(usdThreshold));
      setFxRateInput(String(fxRate));
      setSaving(false);

      const messages = [];
      if (flaggedCount > 0) messages.push(`${flaggedCount} flagged`);
      if (unflaggedCount > 0) messages.push(`${unflaggedCount} unflagged`);

      setToast({
        id: toastId(),
        type: 'success',
        title: 'Saved (demo)',
        message: messages.length > 0 ? messages.join(', ') : undefined,
      });
      return;
    }

    // Save budget config
    const payload = {
      household_id: householdId,
      usd_threshold: usdThreshold,
      fx_usd_to_pen: fxRate,
    };

    const { error } = await supabase
      .from('budget_config')
      .upsert(payload, { onConflict: 'household_id' });

    if (error) {
      setSaving(false);
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Save failed',
        message: error.message,
      });
      return;
    }

    // Apply flag changes
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
    setOriginalFxRate(fxRate);
    setUsdThresholdInput(String(usdThreshold));
    setFxRateInput(String(fxRate));
    setSaving(false);

    const messages = [];
    if (flaggedCount > 0) messages.push(`${flaggedCount} flagged`);
    if (unflaggedCount > 0) messages.push(`${unflaggedCount} unflagged`);

    setToast({
      id: toastId(),
      type: 'success',
      title: 'Settings saved',
      message: messages.length > 0 ? messages.join(', ') : undefined,
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-slate" />
            <CardTitle>Budget Thresholds</CardTitle>
          </div>
          <p className="text-sm text-stone mt-1">
            Transactions over the threshold are automatically flagged for review
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4 max-w-sm">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-11 w-32" />
            </div>
          ) : (
            <div className="space-y-4 max-w-sm">
              {/* USD Threshold */}
              <div className="space-y-1.5">
                <Label>USD Threshold ($)</Label>
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
                  Transactions above this amount are flagged
                </p>
              </div>

              {/* FX Rate */}
              <div className="space-y-1.5">
                <Label>FX Rate (USD to PEN)</Label>
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
                  Used to calculate the PEN threshold
                </p>
              </div>

              {/* Calculated PEN Threshold */}
              <div className="bg-gradient-to-r from-slate/10 to-slate/5 rounded-xl p-4 border border-slate/20">
                <div className="flex items-center gap-2 text-slate mb-1">
                  <Calculator className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    PEN Threshold
                  </span>
                </div>
                <div className="text-xl font-bold text-slate">
                  S/. {penThreshold.toLocaleString()}
                </div>
                <p className="text-xs text-warm-gray mt-1">
                  Calculated as ${usdThreshold} × {fxRate}
                </p>
              </div>

              {!isDemoMode && !householdId ? (
                <p className="text-xs text-warm-gray italic">
                  Log in to customize these settings
                </p>
              ) : (
                <Button
                  onClick={handleSaveClick}
                  disabled={!hasChanges || saving}
                  className="mt-2"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              )}
            </div>
          )}

          <Toast toast={toast} onClose={() => setToast(null)} />
        </CardContent>
      </Card>

      {/* Threshold Change Modal */}
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
