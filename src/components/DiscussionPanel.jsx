'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import Toast from './Toast';
import { toastId } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function DiscussionPanel({ currency }) {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);

  const [householdId, setHouseholdId] = useState(null);
  const [userId, setUserId] = useState(null);

  const [statusRow, setStatusRow] = useState(null);
  const [notes, setNotes] = useState('');
  const [unresolvedFlagged, setUnresolvedFlagged] = useState(0);

  // Use current month for status tracking
  const month = new Date().toISOString().slice(0, 7);

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

  async function markDiscussed() {
    if (demoMode) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Demo mode',
        message: 'Discussion tracking is disabled in demo.',
      });
      return;
    }
    if (unresolvedFlagged > 0) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Blocked',
        message: 'Resolve all flagged explanations first.',
      });
      return;
    }

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
          className="w-full min-h-[120px] rounded-xl border-2 border-white/60 bg-white/70 backdrop-blur-sm px-4 py-3 text-sm text-charcoal placeholder:text-warm-gray/70 focus:border-slate focus:bg-white/90 focus:outline-none resize-none"
        />

        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={saveNotes}>
            Save Notes
          </Button>
          <Button
            onClick={markDiscussed}
            disabled={unresolvedFlagged > 0}
            className={cn(
              unresolvedFlagged > 0 && 'opacity-50 cursor-not-allowed'
            )}
          >
            Mark as Discussed
          </Button>
        </div>

        {unresolvedFlagged > 0 && (
          <p className="text-xs text-warm-gray mt-3">
            Resolve all flagged items above before marking as discussed.
          </p>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CardContent>
    </Card>
  );
}
