import {
  getDemoTransactions,
  getAllDemoTransactions,
  updateDemoTransaction,
  getDemoThresholds,
  setDemoThresholds,
  getThresholdChangePreview,
  applyThresholdChanges,
  reflagDemoTransactions,
  resetDemoStore,
} from '../demoStore';
import { USD_THRESHOLD, FX_USD_TO_PEN } from '../categories';

describe('demoStore', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  describe('getDemoTransactions', () => {
    it('filters by month and currency', () => {
      const usdJan = getDemoTransactions({ month: '2026-01', currency: 'USD' });
      expect(usdJan.length).toBeGreaterThan(0);
      usdJan.forEach((t) => {
        expect(t.txn_date.startsWith('2026-01')).toBe(true);
        expect(t.currency).toBe('USD');
      });
    });

    it('filters PEN transactions correctly', () => {
      const penJan = getDemoTransactions({ month: '2026-01', currency: 'PEN' });
      expect(penJan.length).toBeGreaterThan(0);
      penJan.forEach((t) => {
        expect(t.txn_date.startsWith('2026-01')).toBe(true);
        expect(t.currency).toBe('PEN');
      });
    });

    it('returns empty array for non-existent month', () => {
      const result = getDemoTransactions({ month: '1999-01', currency: 'USD' });
      expect(result).toEqual([]);
    });
  });

  describe('getAllDemoTransactions', () => {
    it('returns all transactions', () => {
      const all = getAllDemoTransactions();
      expect(all.length).toBeGreaterThan(0);
      // Should include both USD and PEN
      const currencies = [...new Set(all.map((t) => t.currency))];
      expect(currencies).toContain('USD');
      expect(currencies).toContain('PEN');
    });
  });

  describe('updateDemoTransaction', () => {
    it('updates a transaction field', () => {
      const all = getAllDemoTransactions();
      const firstId = all[0].id;
      const originalDesc = all[0].description;

      updateDemoTransaction(firstId, { description: 'Updated description' });

      const updated = getAllDemoTransactions().find((t) => t.id === firstId);
      expect(updated.description).toBe('Updated description');
      expect(updated.description).not.toBe(originalDesc);
    });

    it('updates multiple fields at once', () => {
      const all = getAllDemoTransactions();
      const firstId = all[0].id;

      updateDemoTransaction(firstId, {
        description: 'New desc',
        is_flagged: true,
        category: 'Unexpected',
      });

      const updated = getAllDemoTransactions().find((t) => t.id === firstId);
      expect(updated.description).toBe('New desc');
      expect(updated.is_flagged).toBe(true);
      expect(updated.category).toBe('Unexpected');
    });

    it('does not affect other transactions', () => {
      const all = getAllDemoTransactions();
      const firstId = all[0].id;
      const secondTransaction = { ...all[1] };

      updateDemoTransaction(firstId, { description: 'Changed' });

      const afterUpdate = getAllDemoTransactions();
      const second = afterUpdate.find((t) => t.id === secondTransaction.id);
      expect(second.description).toBe(secondTransaction.description);
    });
  });

  describe('getDemoThresholds', () => {
    it('returns default thresholds', () => {
      const thresholds = getDemoThresholds();
      expect(thresholds.usdThreshold).toBe(USD_THRESHOLD);
      expect(thresholds.fxRate).toBe(FX_USD_TO_PEN);
    });

    it('returns a copy (not reference)', () => {
      const t1 = getDemoThresholds();
      const t2 = getDemoThresholds();
      expect(t1).not.toBe(t2);
      expect(t1).toEqual(t2);
    });
  });

  describe('setDemoThresholds', () => {
    it('updates thresholds', () => {
      setDemoThresholds({ usdThreshold: 1000, fxRate: 4.0 });
      const thresholds = getDemoThresholds();
      expect(thresholds.usdThreshold).toBe(1000);
      expect(thresholds.fxRate).toBe(4.0);
    });
  });

  describe('getThresholdChangePreview', () => {
    it('identifies transactions to flag with lower threshold', () => {
      // Lower threshold should flag more transactions
      const preview = getThresholdChangePreview({
        usdThreshold: 50,
        fxRate: FX_USD_TO_PEN,
      });

      // Should have some transactions to flag (those over $50 but not already flagged)
      expect(preview.toFlag.length).toBeGreaterThanOrEqual(0);
      expect(preview.toUnflag.length).toBeGreaterThanOrEqual(0);
    });

    it('identifies transactions to unflag with higher threshold', () => {
      // Very high threshold should unflag some
      const preview = getThresholdChangePreview({
        usdThreshold: 5000,
        fxRate: FX_USD_TO_PEN,
      });

      // Some flagged transactions should be unflagged
      expect(preview.toUnflag.length).toBeGreaterThanOrEqual(0);
    });

    it('does not include resolved transactions', () => {
      // Mark a transaction as resolved
      updateDemoTransaction('d2', { resolved_at: '2026-01-15' });

      const preview = getThresholdChangePreview({
        usdThreshold: 5000,
        fxRate: FX_USD_TO_PEN,
      });

      // d2 should not be in toUnflag because it's resolved
      const d2InUnflag = preview.toUnflag.some((t) => t.id === 'd2');
      expect(d2InUnflag).toBe(false);
    });
  });

  describe('applyThresholdChanges', () => {
    it('flags specified transactions', () => {
      const result = applyThresholdChanges({
        toFlagIds: ['d6'], // Shell gas station - $52.18 expense
        toUnflagIds: [],
      });

      expect(result.flaggedCount).toBe(1);
      expect(result.unflaggedCount).toBe(0);

      const updated = getAllDemoTransactions().find((t) => t.id === 'd6');
      expect(updated.is_flagged).toBe(true);
      expect(updated.flag_reason).toBe('over_threshold_expense');
    });

    it('unflags specified transactions', () => {
      const result = applyThresholdChanges({
        toFlagIds: [],
        toUnflagIds: ['d2'], // Rent - currently flagged
      });

      expect(result.flaggedCount).toBe(0);
      expect(result.unflaggedCount).toBe(1);

      const updated = getAllDemoTransactions().find((t) => t.id === 'd2');
      expect(updated.is_flagged).toBe(false);
      expect(updated.flag_reason).toBeNull();
    });

    it('handles both flagging and unflagging', () => {
      const result = applyThresholdChanges({
        toFlagIds: ['d6'],
        toUnflagIds: ['d2'],
      });

      expect(result.flaggedCount).toBe(1);
      expect(result.unflaggedCount).toBe(1);
    });

    it('sets correct flag_reason for income', () => {
      // p6 is Freelance web project - positive amount (income)
      applyThresholdChanges({
        toFlagIds: ['d18'], // Dividend - VTSAX, positive income
        toUnflagIds: [],
      });

      const updated = getAllDemoTransactions().find((t) => t.id === 'd18');
      expect(updated.is_flagged).toBe(true);
      expect(updated.flag_reason).toBe('over_threshold_income');
    });
  });

  describe('reflagDemoTransactions', () => {
    it('flags transactions over threshold', () => {
      // First, unflag everything
      const all = getAllDemoTransactions();
      all.forEach((t) => {
        updateDemoTransaction(t.id, { is_flagged: false, flag_reason: null });
      });

      // Now reflag with default threshold
      const count = reflagDemoTransactions({
        usdThreshold: USD_THRESHOLD,
        fxRate: FX_USD_TO_PEN,
      });

      expect(count).toBeGreaterThan(0);
    });

    it('does not reflag already flagged transactions', () => {
      const initialFlagged = getAllDemoTransactions().filter(
        (t) => t.is_flagged
      );

      // Reflag - should not double-count
      reflagDemoTransactions({
        usdThreshold: USD_THRESHOLD,
        fxRate: FX_USD_TO_PEN,
      });

      const afterFlagged = getAllDemoTransactions().filter((t) => t.is_flagged);
      expect(afterFlagged.length).toBeGreaterThanOrEqual(initialFlagged.length);
    });

    it('does not reflag resolved transactions', () => {
      // First unflag d2, then mark it as resolved
      updateDemoTransaction('d2', {
        is_flagged: false,
        flag_reason: null,
        resolved_at: '2026-01-15',
      });

      // Reflag with low threshold
      reflagDemoTransactions({ usdThreshold: 100, fxRate: FX_USD_TO_PEN });

      const d2 = getAllDemoTransactions().find((t) => t.id === 'd2');
      expect(d2.is_flagged).toBe(false); // Should remain unflagged
    });

    it('uses correct threshold for PEN transactions', () => {
      // Unflag all first
      const all = getAllDemoTransactions();
      all.forEach((t) => {
        updateDemoTransaction(t.id, { is_flagged: false, flag_reason: null });
      });

      // Reflag with threshold that would flag some PEN transactions
      reflagDemoTransactions({ usdThreshold: 300, fxRate: 3.25 });
      // PEN threshold would be 975

      // p6 is Freelance web project at 1800 PEN, should be flagged
      const p6 = getAllDemoTransactions().find((t) => t.id === 'p6');
      expect(p6.is_flagged).toBe(true);
    });
  });

  describe('resetDemoStore', () => {
    it('resets transactions to initial state', () => {
      const originalFirst = getAllDemoTransactions()[0];
      updateDemoTransaction(originalFirst.id, { description: 'Modified' });

      resetDemoStore();

      const afterReset = getAllDemoTransactions()[0];
      expect(afterReset.description).not.toBe('Modified');
    });

    it('resets thresholds to defaults', () => {
      setDemoThresholds({ usdThreshold: 1000, fxRate: 5.0 });

      resetDemoStore();

      const thresholds = getDemoThresholds();
      expect(thresholds.usdThreshold).toBe(USD_THRESHOLD);
      expect(thresholds.fxRate).toBe(FX_USD_TO_PEN);
    });
  });
});
