'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { colors, styles } from '@/lib/theme';
import Toast from './Toast';
import { toastId } from '@/lib/format';
import { USD_THRESHOLD, FX_USD_TO_PEN } from '@/lib/categories';

export default function BudgetSettings() {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [usdThreshold, setUsdThreshold] = useState(USD_THRESHOLD);
  const [fxRate, setFxRate] = useState(FX_USD_TO_PEN);

  const penThreshold = Math.round(usdThreshold * fxRate);

  useEffect(() => {
    setDemoMode(getDemoMode());
    (async () => {
      if (getDemoMode()) {
        setUsdThreshold(USD_THRESHOLD);
        setFxRate(FX_USD_TO_PEN);
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
        setFxRate(config.fx_usd_to_pen);
      }

      setLoading(false);
    })();
  }, []);

  async function saveSettings() {
    if (demoMode) {
      setToast({
        id: toastId(),
        type: 'success',
        title: 'Saved (demo)',
        message: 'Settings saved in demo mode.',
      });
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

    const payload = {
      household_id: householdId,
      usd_threshold: usdThreshold,
      fx_usd_to_pen: fxRate,
    };

    const { error } = await supabase
      .from('budget_config')
      .upsert(payload, { onConflict: 'household_id' });

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Save failed',
        message: error.message,
      });
    } else {
      setToast({
        id: toastId(),
        type: 'success',
        title: 'Settings saved',
      });
    }
  }

  if (loading) {
    return (
      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Budget Thresholds</h2>
        <p style={{ color: colors.textMuted }}>Loading...</p>
      </section>
    );
  }

  return (
    <section style={styles.card}>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Budget Thresholds</h2>
      <p
        style={{ marginTop: 0, marginBottom: 20, color: colors.textSecondary }}
      >
        Transactions over the threshold are automatically flagged for review.
      </p>

      {!demoMode && !householdId && (
        <p style={{ color: colors.textMuted }}>
          Log in and set up a household to configure settings.
        </p>
      )}

      <div style={{ display: 'grid', gap: 16, maxWidth: 300 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: colors.textSecondary,
            }}
          >
            USD Threshold ($)
          </span>
          <input
            type="number"
            min="0"
            step="50"
            value={usdThreshold}
            onChange={(e) => setUsdThreshold(Number(e.target.value))}
            style={styles.input}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: colors.textSecondary,
            }}
          >
            FX Rate (USD to PEN)
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={fxRate}
            onChange={(e) => setFxRate(Number(e.target.value))}
            style={styles.input}
          />
        </label>

        <div
          style={{
            padding: 16,
            background: colors.bgHover,
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          <div style={{ fontWeight: 600, color: colors.textPrimary }}>
            PEN Threshold: S/. {penThreshold.toLocaleString()}
          </div>
          <div style={{ color: colors.textMuted, marginTop: 4 }}>
            Calculated as ${usdThreshold} × {fxRate}
          </div>
        </div>

        <button
          onClick={saveSettings}
          style={{
            ...styles.button,
            ...styles.buttonPrimary,
            marginTop: 4,
          }}
        >
          Save Settings
        </button>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
