'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDemoRecurring,
  getDemoRecurringById,
  addDemoRecurring,
  updateDemoRecurring,
  deleteDemoRecurring,
  getAllDemoExceptions,
  addDemoException,
  removeDemoException,
  isDemoOccurrenceSkipped,
  getDemoRecurringFingerprints,
  addDemoTransaction,
} from '@/lib/demoStore';
import {
  calculateOccurrences,
  shouldGenerateOccurrence,
  generateTransactionFromRecurring,
  generateRecurringFingerprint,
  getNextOccurrence,
  formatDateString,
} from '@/lib/recurringUtils';
import { supabase } from '@/lib/supabaseClient';
import { useDemo } from './useDemo';

/**
 * Hook for managing recurring transactions
 * Handles both demo mode and Supabase-backed mode
 */
export function useRecurringTransactions() {
  const { isDemoMode } = useDemo();
  const { user, householdId } = useAuth();
  const [recurring, setRecurring] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load recurring transactions
  const loadRecurring = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        setRecurring(getDemoRecurring());
        setExceptions(getAllDemoExceptions());
      } else if (householdId) {
        // Load from Supabase
        const { data: recData, error: recError } = await supabase
          .from('recurring_transactions')
          .select('*')
          .eq('household_id', householdId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (recError) throw recError;
        setRecurring(recData || []);

        // Load exceptions
        const recurringIds = (recData || []).map((r) => r.id);
        if (recurringIds.length > 0) {
          const { data: excData, error: excError } = await supabase
            .from('recurring_exceptions')
            .select('*')
            .in('recurring_id', recurringIds);

          if (excError) throw excError;
          setExceptions(excData || []);
        } else {
          setExceptions([]);
        }
      }
    } catch (err) {
      console.error('Error loading recurring transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, householdId]);

  useEffect(() => {
    loadRecurring();
  }, [loadRecurring]);

  // Add a new recurring transaction
  const addRecurring = useCallback(
    async (data) => {
      try {
        if (isDemoMode) {
          const id = addDemoRecurring(data);
          setRecurring(getDemoRecurring());
          return { id, error: null };
        }

        const { data: inserted, error: insertError } = await supabase
          .from('recurring_transactions')
          .insert({
            ...data,
            household_id: householdId,
            created_by: user?.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setRecurring((prev) => [inserted, ...prev]);
        return { id: inserted.id, error: null };
      } catch (err) {
        console.error('Error adding recurring transaction:', err);
        return { id: null, error: err.message };
      }
    },
    [isDemoMode, householdId, user]
  );

  // Update a recurring transaction
  const updateRecurring = useCallback(
    async (id, updates) => {
      try {
        if (isDemoMode) {
          updateDemoRecurring(id, updates);
          setRecurring(getDemoRecurring());
          return { error: null };
        }

        const { error: updateError } = await supabase
          .from('recurring_transactions')
          .update(updates)
          .eq('id', id);

        if (updateError) throw updateError;
        setRecurring((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
        );
        return { error: null };
      } catch (err) {
        console.error('Error updating recurring transaction:', err);
        return { error: err.message };
      }
    },
    [isDemoMode]
  );

  // Delete (deactivate) a recurring transaction
  const deleteRecurring = useCallback(
    async (id) => {
      try {
        if (isDemoMode) {
          deleteDemoRecurring(id);
          setRecurring(getDemoRecurring());
          return { error: null };
        }

        const { error: deleteError } = await supabase
          .from('recurring_transactions')
          .update({ is_active: false })
          .eq('id', id);

        if (deleteError) throw deleteError;
        setRecurring((prev) => prev.filter((r) => r.id !== id));
        return { error: null };
      } catch (err) {
        console.error('Error deleting recurring transaction:', err);
        return { error: err.message };
      }
    },
    [isDemoMode]
  );

  // Skip an occurrence
  const skipOccurrence = useCallback(
    async (recurringId, occurrenceDate) => {
      try {
        if (isDemoMode) {
          addDemoException(recurringId, occurrenceDate);
          setExceptions(getAllDemoExceptions());
          return { error: null };
        }

        const { error: insertError } = await supabase
          .from('recurring_exceptions')
          .insert({
            recurring_id: recurringId,
            occurrence_date: occurrenceDate,
            exception_type: 'skip',
            created_by: user?.id,
          });

        if (insertError) throw insertError;
        setExceptions((prev) => [
          ...prev,
          {
            recurring_id: recurringId,
            occurrence_date: occurrenceDate,
            exception_type: 'skip',
          },
        ]);
        return { error: null };
      } catch (err) {
        console.error('Error skipping occurrence:', err);
        return { error: err.message };
      }
    },
    [isDemoMode, user]
  );

  // Undo skip (remove exception)
  const undoSkip = useCallback(
    async (recurringId, occurrenceDate) => {
      try {
        if (isDemoMode) {
          removeDemoException(recurringId, occurrenceDate);
          setExceptions(getAllDemoExceptions());
          return { error: null };
        }

        const { error: deleteError } = await supabase
          .from('recurring_exceptions')
          .delete()
          .eq('recurring_id', recurringId)
          .eq('occurrence_date', occurrenceDate);

        if (deleteError) throw deleteError;
        setExceptions((prev) =>
          prev.filter(
            (e) =>
              !(
                e.recurring_id === recurringId &&
                e.occurrence_date === occurrenceDate
              )
          )
        );
        return { error: null };
      } catch (err) {
        console.error('Error undoing skip:', err);
        return { error: err.message };
      }
    },
    [isDemoMode]
  );

  // Generate transactions for a date range
  const generateForDateRange = useCallback(
    async (startDate, endDate) => {
      if (recurring.length === 0) return { generated: 0, error: null };

      try {
        let generated = 0;

        if (isDemoMode) {
          const existingFingerprints = getDemoRecurringFingerprints();

          for (const rec of recurring) {
            const occurrences = calculateOccurrences(rec, startDate, endDate);

            for (const date of occurrences) {
              const fingerprint = generateRecurringFingerprint(rec.id, date);

              // Skip if already exists or is skipped
              if (existingFingerprints.has(fingerprint)) continue;
              if (isDemoOccurrenceSkipped(rec.id, date)) continue;

              // Generate transaction
              const txn = generateTransactionFromRecurring(
                rec,
                date,
                'demo_household',
                'demo_user'
              );
              addDemoTransaction(txn);
              existingFingerprints.add(fingerprint);
              generated++;
            }
          }

          return { generated, error: null };
        }

        // Supabase mode
        // Get existing fingerprints for this date range
        const { data: existingTxns, error: fetchError } = await supabase
          .from('transactions')
          .select('recurring_fingerprint')
          .eq('household_id', householdId)
          .not('recurring_fingerprint', 'is', null)
          .gte('txn_date', startDate)
          .lte('txn_date', endDate);

        if (fetchError) throw fetchError;

        const existingFingerprints = new Set(
          (existingTxns || []).map((t) => t.recurring_fingerprint)
        );

        const toInsert = [];

        for (const rec of recurring) {
          const occurrences = calculateOccurrences(rec, startDate, endDate);
          const recExceptions = exceptions.filter(
            (e) => e.recurring_id === rec.id
          );

          for (const date of occurrences) {
            const fingerprint = generateRecurringFingerprint(rec.id, date);

            // Skip if already exists
            if (existingFingerprints.has(fingerprint)) continue;

            // Skip if exception exists
            if (!shouldGenerateOccurrence(rec, date, recExceptions)) continue;

            // Add to insert batch
            toInsert.push(
              generateTransactionFromRecurring(rec, date, householdId, user?.id)
            );
          }
        }

        if (toInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(toInsert);

          if (insertError) throw insertError;
          generated = toInsert.length;
        }

        return { generated, error: null };
      } catch (err) {
        console.error('Error generating recurring transactions:', err);
        return { generated: 0, error: err.message };
      }
    },
    [isDemoMode, recurring, exceptions, householdId, user]
  );

  // Get a recurring transaction by ID
  const getRecurringById = useCallback(
    (id) => {
      if (isDemoMode) {
        return getDemoRecurringById(id);
      }
      return recurring.find((r) => r.id === id) || null;
    },
    [isDemoMode, recurring]
  );

  // Check if an occurrence is skipped
  const isOccurrenceSkipped = useCallback(
    (recurringId, occurrenceDate) => {
      if (isDemoMode) {
        return isDemoOccurrenceSkipped(recurringId, occurrenceDate);
      }
      return exceptions.some(
        (e) =>
          e.recurring_id === recurringId &&
          e.occurrence_date === occurrenceDate &&
          e.exception_type === 'skip'
      );
    },
    [isDemoMode, exceptions]
  );

  // Get next occurrence date for a recurring transaction
  const getNextOccurrenceDate = useCallback((rec) => {
    const today = formatDateString(new Date());
    return getNextOccurrence(rec, today);
  }, []);

  return {
    recurring,
    exceptions,
    loading,
    error,
    refresh: loadRecurring,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    skipOccurrence,
    undoSkip,
    generateForDateRange,
    getRecurringById,
    isOccurrenceSkipped,
    getNextOccurrenceDate,
  };
}
