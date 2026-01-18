'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Flag,
} from 'lucide-react';
import Toast from './Toast';
import { toastId } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function DiscussionPanel({ currency, onScrollToFlagged }) {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  const [householdId, setHouseholdId] = useState(null);
  const [userId, setUserId] = useState(null);

  const [statusRow, setStatusRow] = useState(null);
  const [notes, setNotes] = useState('');
  const [unresolvedFlagged, setUnresolvedFlagged] = useState(0);

  // Use current month for status tracking
  const month = new Date().toISOString().slice(0, 7);

  // Handle escape key to close dialog
  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape' && showWarningDialog) {
        setShowWarningDialog(false);
      }
    },
    [showWarningDialog]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (showWarningDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showWarningDialog]);

  useEffect(() => {
    setDemoMode(getDemoMode());
    loadData();
  }, [currency]);

  async function loadData() {
    if (getDemoMode()) {
      setStatusRow({ status: 'draft', discussed_at: null });
      setNotes('');
      setUnresolvedFlagged(1);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    setUserId(user?.id || null);
    if (!user) return;

    const { data: p } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!p?.household_id) return;
    setHouseholdId(p.household_id);

    const { data: ms } = await supabase
      .from('month_status')
      .select('*')
      .eq('household_id', p.household_id)
      .eq('month', month)
      .eq('currency', currency)
      .maybeSingle();

    if (ms) {
      setStatusRow(ms);
      setNotes(ms.discussion_notes || '');
    } else {
      setStatusRow({
        status: 'draft',
        discussed_at: null,
        discussion_notes: '',
      });
    }

    const { data: flagged } = await supabase
      .from('transactions')
      .select('id,explanation')
      .eq('household_id', p.household_id)
      .eq('currency', currency)
      .eq('is_flagged', true);

    const unresolved = (flagged || []).filter(
      (r) => !(r.explanation && r.explanation.trim().length > 0)
    ).length;
    setUnresolvedFlagged(unresolved);
  }

  async function saveNotes() {
    if (demoMode) {
      setToast({ id: toastId(), type: 'success', title: 'Saved (demo)' });
      return;
    }
    if (!householdId) return;

    const payload = {
      household_id: householdId,
      month,
      currency,
      discussion_notes: notes,
      status: statusRow?.status || 'draft',
    };

    const { error } = await supabase
      .from('month_status')
      .upsert(payload, { onConflict: 'household_id,month,currency' });
    if (error)
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Save failed',
        message: error.message,
      });
    else setToast({ id: toastId(), type: 'success', title: 'Notes saved' });
  }

  function handleMarkDiscussedClick() {
    if (demoMode) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Demo mode',
        message: 'Discussion tracking is disabled in demo.',
      });
      return;
    }

    // If there are unresolved flags, show the warning dialog
    if (unresolvedFlagged > 0) {
      setShowWarningDialog(true);
      return;
    }

    // No unresolved flags, proceed directly
    markDiscussed();
  }

  function handleReviewItems() {
    setShowWarningDialog(false);
    // Scroll to the flagged review section
    onScrollToFlagged?.();
  }

  async function markDiscussed() {
    setShowWarningDialog(false);

    const payload = {
      household_id: householdId,
      month,
      currency,
      status: 'discussed',
      discussion_notes: notes,
      discussed_at: new Date().toISOString(),
      discussed_by: userId,
    };

    const { error } = await supabase
      .from('month_status')
      .upsert(payload, { onConflict: 'household_id,month,currency' });
    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Failed',
        message: error.message,
      });
      return;
    }
    setStatusRow({
      ...statusRow,
      status: 'discussed',
      discussed_at: payload.discussed_at,
    });
    setToast({ id: toastId(), type: 'success', title: 'Marked as discussed' });
  }

  const isDiscussed = statusRow?.status === 'discussed';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-slate" />
          <CardTitle>Discussion Notes</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status badges */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
              isDiscussed
                ? 'bg-success/15 text-success border border-success/30'
                : 'bg-warning/15 text-warning border border-warning/30'
            )}
          >
            {isDiscussed ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            {isDiscussed ? 'Discussed' : 'Draft'}
          </div>

          {unresolvedFlagged > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-error/15 text-error border border-error/30">
              <AlertTriangle className="w-4 h-4" />
              {unresolvedFlagged} unresolved
            </div>
          )}

          {statusRow?.discussed_at && (
            <div className="text-xs text-warm-gray self-center">
              {new Date(statusRow.discussed_at).toLocaleDateString()}
            </div>
          )}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What we agreed on, next month's focus, action items..."
          className="w-full min-h-[120px] rounded-xl border-2 border-white/60 bg-white/70 backdrop-blur-sm px-4 py-3 text-sm text-charcoal placeholder:text-warm-gray/70 focus-visible:border-slate focus-visible:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate/50 focus-visible:ring-offset-1 resize-none"
        />

        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={saveNotes}>
            Save Notes
          </Button>
          <Button
            onClick={handleMarkDiscussedClick}
            className={cn(
              unresolvedFlagged > 0 && 'relative',
              isDiscussed && 'bg-success hover:bg-success/90'
            )}
          >
            {isDiscussed ? 'Discussed' : 'Mark as Discussed'}
            {unresolvedFlagged > 0 && !isDiscussed && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 text-xs font-bold bg-warning text-white rounded-full">
                {unresolvedFlagged}
              </span>
            )}
          </Button>
        </div>

        {unresolvedFlagged > 0 && !isDiscussed && (
          <p className="text-xs text-warm-gray mt-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            {unresolvedFlagged} flagged item{unresolvedFlagged !== 1 ? 's' : ''}{' '}
            need{unresolvedFlagged === 1 ? 's' : ''} explanation before marking
            as discussed.
          </p>
        )}

        {/* Warning Dialog */}
        {showWarningDialog && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowWarningDialog(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="warning-dialog-title"
            aria-describedby="warning-dialog-desc"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-white/80 p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-warning/20 to-warning/10 text-warning">
                  <Flag className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2
                    id="warning-dialog-title"
                    className="text-lg font-bold text-charcoal mb-1"
                  >
                    Unresolved Items
                  </h2>
                  <p
                    id="warning-dialog-desc"
                    className="text-sm text-stone leading-relaxed"
                  >
                    You have <strong>{unresolvedFlagged}</strong> flagged
                    transaction{unresolvedFlagged !== 1 ? 's' : ''} without
                    explanations. These should be reviewed before marking the
                    month as discussed.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleReviewItems} className="w-full">
                  <Flag className="w-4 h-4 mr-2" />
                  Review Flagged Items
                </Button>
                <Button
                  variant="outline"
                  onClick={markDiscussed}
                  className="w-full text-warning border-warning/30 hover:bg-warning/10"
                >
                  Mark Anyway
                </Button>
                <button
                  onClick={() => setShowWarningDialog(false)}
                  className="text-sm text-warm-gray hover:text-charcoal mt-1 rounded-lg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CardContent>
    </Card>
  );
}
