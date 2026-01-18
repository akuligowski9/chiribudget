'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDemo } from '@/hooks/useDemo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Save, X, BookOpen } from 'lucide-react';
import Toast from './Toast';
import { toastId } from '@/lib/format';

const DEFAULT_GUIDELINES = `• For all income and losses, track how much is saved / lost per month (Alex, Adriana, Together)

• **Expense categories:** Fixed Expenses, Rent/Mortgages, Food, Dogs, Holidays & Birthdays, Adventure, Unexpected

• **Income categories:** Salary, Investments, Extra

• Any expense over the threshold is flagged (categorized as Unexpected)

• Any income over the threshold is flagged (categorized as Extra)

• Update each month by month-end — discuss together at least once after updates

• Notify each other before new recurring costs or spending over the threshold`;

export default function Guidelines() {
  const { isDemoMode } = useDemo();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const [householdId, setHouseholdId] = useState(null);
  const [guidelines, setGuidelines] = useState(DEFAULT_GUIDELINES);
  const [originalGuidelines, setOriginalGuidelines] =
    useState(DEFAULT_GUIDELINES);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedByName, setUpdatedByName] = useState(null);

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadGuidelines();
  }, [isDemoMode]);

  async function loadGuidelines() {
    setLoading(true);

    if (isDemoMode) {
      setGuidelines(DEFAULT_GUIDELINES);
      setOriginalGuidelines(DEFAULT_GUIDELINES);
      setUpdatedAt(new Date('2025-12-01'));
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.household_id) {
      setLoading(false);
      return;
    }

    setHouseholdId(profile.household_id);

    const { data: config } = await supabase
      .from('budget_config')
      .select('guidelines, guidelines_updated_at, guidelines_updated_by')
      .eq('household_id', profile.household_id)
      .maybeSingle();

    if (config) {
      const g = config.guidelines || DEFAULT_GUIDELINES;
      setGuidelines(g);
      setOriginalGuidelines(g);
      setUpdatedAt(
        config.guidelines_updated_at
          ? new Date(config.guidelines_updated_at)
          : null
      );

      // Get updater's name if available
      if (config.guidelines_updated_by) {
        const { data: updaterProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', config.guidelines_updated_by)
          .maybeSingle();
        setUpdatedByName(updaterProfile?.display_name || 'Unknown');
      }
    }

    setLoading(false);
  }

  function startEditing() {
    setEditValue(guidelines);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditValue('');
  }

  async function saveGuidelines() {
    // Only save if content actually changed
    if (editValue.trim() === originalGuidelines.trim()) {
      setEditing(false);
      setToast({ id: toastId(), type: 'success', title: 'No changes made' });
      return;
    }

    if (isDemoMode) {
      setGuidelines(editValue);
      setOriginalGuidelines(editValue);
      setUpdatedAt(new Date());
      setUpdatedByName('You (demo)');
      setEditing(false);
      setToast({ id: toastId(), type: 'success', title: 'Updated (demo)' });
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

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    const { error } = await supabase.from('budget_config').upsert(
      {
        household_id: householdId,
        guidelines: editValue.trim(),
        guidelines_updated_at: new Date().toISOString(),
        guidelines_updated_by: user?.id,
      },
      { onConflict: 'household_id' }
    );

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Save failed',
        message: error.message,
      });
      return;
    }

    setGuidelines(editValue.trim());
    setOriginalGuidelines(editValue.trim());
    setUpdatedAt(new Date());
    setUpdatedByName('You');
    setEditing(false);
    setToast({ id: toastId(), type: 'success', title: 'Guidelines updated' });
  }

  function formatDate(date) {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Convert markdown-like formatting to styled elements
  function renderGuidelines(text) {
    const lines = text.split('\n').filter((line) => line.trim());

    return (
      <ul className="space-y-3 list-none p-0 m-0">
        {lines.map((line, i) => {
          // Remove bullet point if present
          let content = line.trim();
          const hasBullet = content.startsWith('•') || content.startsWith('-');
          if (hasBullet) {
            content = content.slice(1).trim();
          }

          // Replace **text** with bold spans
          const parts = content.split(/(\*\*[^*]+\*\*)/g);
          const rendered = parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <span key={j} className="font-semibold text-charcoal">
                  {part.slice(2, -2)}
                </span>
              );
            }
            return part;
          });

          return (
            <li key={i} className="flex gap-2">
              <span className="text-slate shrink-0">•</span>
              <span>{rendered}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate" />
            <CardTitle>Rules & Guidelines</CardTitle>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
          )}
        </div>
        <p className="text-xs text-warm-gray mt-1">
          Last Updated: {formatDate(updatedAt)}
          {updatedByName && ` by ${updatedByName}`}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
                <Skeleton
                  className={`h-4 ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`}
                />
              </div>
            ))}
          </div>
        ) : editing ? (
          <div className="space-y-3">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full min-h-[280px] p-3 text-sm rounded-xl border border-sand bg-white/70 focus:border-slate focus:outline-none resize-y"
              placeholder="Enter your household rules and guidelines..."
            />
            <p className="text-xs text-warm-gray">
              Formatting: Start lines with • or - for bullets, use **text** for
              bold
            </p>
            <div className="flex gap-2">
              <Button onClick={saveGuidelines}>
                <Save className="w-4 h-4 mr-1.5" />
                Save
              </Button>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="w-4 h-4 mr-1.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-stone leading-relaxed">
            {renderGuidelines(guidelines)}
          </div>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CardContent>
    </Card>
  );
}
