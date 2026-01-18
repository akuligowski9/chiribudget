'use client';

import { useEffect, useState } from 'react';
import { Pencil, Save, X, BookOpen, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  CollapsibleCard,
  useCollapsible,
} from '@/components/ui/collapsible-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemo } from '@/hooks/useDemo';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import Toast from './Toast';

const DEFAULT_GUIDELINES = `• For all income and losses, track how much is saved / lost per month (Alex, Adriana, Together)

• **Expense categories:** Fixed Expenses, Rent/Mortgages, Food, Dogs, Holidays & Birthdays, Adventure, Unexpected

• **Income categories:** Salary, Investments, Extra

• Any expense over the threshold is flagged (categorized as Unexpected)

• Any income over the threshold is flagged (categorized as Extra)

• Update each month by month-end — discuss together at least once after updates

• Notify each other before new recurring costs or spending over the threshold`;

export default function Guidelines() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const { isOpen, toggle } = useCollapsible(false);
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
    if (editValue.trim() === originalGuidelines.trim()) {
      setEditing(false);
      setToast({
        id: toastId(),
        type: 'success',
        title: t('settings.noChangesMade'),
      });
      return;
    }

    if (isDemoMode) {
      setGuidelines(editValue);
      setOriginalGuidelines(editValue);
      setUpdatedAt(new Date());
      setUpdatedByName('You (demo)');
      setEditing(false);
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
        title: t('settings.saveFailed'),
        message: error.message,
      });
      return;
    }

    setGuidelines(editValue.trim());
    setOriginalGuidelines(editValue.trim());
    setUpdatedAt(new Date());
    setUpdatedByName('You');
    setEditing(false);
    setToast({
      id: toastId(),
      type: 'success',
      title: t('settings.guidelinesUpdated'),
    });
  }

  function formatDate(date) {
    if (!date) return t('settings.never');
    return date.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }

  function renderGuidelines(text) {
    const lines = text.split('\n').filter((line) => line.trim());

    return (
      <ul className="space-y-3 list-none p-0 m-0">
        {lines.map((line, i) => {
          let content = line.trim();
          const hasBullet = content.startsWith('•') || content.startsWith('-');
          if (hasBullet) {
            content = content.slice(1).trim();
          }

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
    <CollapsibleCard>
      {/* Custom header with Edit button */}
      <div className="w-full px-5 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-3 text-left flex-1 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate focus-visible:ring-offset-2 rounded-lg"
          aria-expanded={isOpen}
        >
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate/10 to-slate/5">
            <BookOpen className="w-5 h-5 text-slate" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold tracking-tight text-charcoal">
              {t('settings.rulesGuidelines')}
            </h3>
            <p className="text-xs text-warm-gray mt-0.5">
              {updatedByName
                ? t('settings.lastUpdatedBy', {
                    date: formatDate(updatedAt),
                    name: updatedByName,
                  })
                : t('settings.lastUpdated', { date: formatDate(updatedAt) })}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-slate transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
        {!editing && isOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={startEditing}
            className="ml-3 shrink-0"
          >
            <Pencil className="w-4 h-4 mr-1.5" />
            {t('common.edit')}
          </Button>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">
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
                  placeholder={t('settings.guidelinesPlaceholder')}
                />
                <p className="text-xs text-warm-gray">
                  {t('settings.formattingHelp')}
                </p>
                <div className="flex gap-2">
                  <Button onClick={saveGuidelines}>
                    <Save className="w-4 h-4 mr-1.5" />
                    {t('common.save')}
                  </Button>
                  <Button variant="outline" onClick={cancelEditing}>
                    <X className="w-4 h-4 mr-1.5" />
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-stone leading-relaxed">
                {renderGuidelines(guidelines)}
              </div>
            )}

            <Toast toast={toast} onClose={() => setToast(null)} />
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
