'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, LogOut, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Toast from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { COPY_FEEDBACK_MS } from '@/lib/constants';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';

export default function HouseholdMembers() {
  const t = useTranslations();
  const { user, profile, refreshProfile } = useAuth();
  const { isDemoMode } = useDemo();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  useEffect(() => {
    loadHouseholdData();
  }, [profile?.household_id]);

  async function loadHouseholdData() {
    if (isDemoMode) {
      setHousehold({ name: 'Demo Household', join_code: 'demo123456' });
      setMembers([
        {
          user_id: 'demo-user-1',
          display_name: 'You',
          created_at: new Date().toISOString(),
          is_current_user: true,
        },
        {
          user_id: 'demo-user-2',
          display_name: 'Partner',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          is_current_user: false,
        },
      ]);
      setLoading(false);
      return;
    }

    if (!profile?.household_id) {
      setLoading(false);
      return;
    }

    try {
      // Get household info
      const { data: hh, error: hhErr } = await supabase
        .from('households')
        .select('id, name, join_code')
        .eq('id', profile.household_id)
        .single();

      if (hhErr) throw hhErr;
      setHousehold(hh);

      // Get members with their profiles
      const { data: memberList, error: memErr } = await supabase
        .from('household_members')
        .select('user_id, created_at')
        .eq('household_id', profile.household_id);

      if (memErr) throw memErr;

      // Get profiles for all members
      const userIds = memberList.map((m) => m.user_id);
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      if (profErr) throw profErr;

      // Combine member data with profiles
      const enrichedMembers = memberList.map((m) => {
        const memberProfile = profiles?.find((p) => p.user_id === m.user_id);
        const isCurrentUser = m.user_id === user?.id;
        return {
          user_id: m.user_id,
          display_name: isCurrentUser
            ? 'You'
            : memberProfile?.display_name || 'Partner',
          created_at: m.created_at,
          is_current_user: isCurrentUser,
        };
      });

      // Sort: current user first, then by join date
      enrichedMembers.sort((a, b) => {
        if (a.is_current_user) return -1;
        if (b.is_current_user) return 1;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      setMembers(enrichedMembers);
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('household.failedToLoad'),
        message: e.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyJoinCode() {
    if (!household?.join_code) return;
    await navigator.clipboard.writeText(household.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  function handleRemoveClick(member) {
    setMemberToRemove(member);
    setConfirmOpen(true);
  }

  async function removeMember() {
    if (!memberToRemove || isDemoMode) {
      if (isDemoMode) {
        setToast({
          id: toastId(),
          type: 'error',
          title: t('household.demoMode'),
          message: t('household.cannotRemoveDemo'),
        });
      }
      return;
    }

    try {
      // Delete from household_members
      const { error: memErr } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', profile.household_id)
        .eq('user_id', memberToRemove.user_id);

      if (memErr) throw memErr;

      // Update their profile to remove household association
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ household_id: null })
        .eq('user_id', memberToRemove.user_id);

      if (profErr) throw profErr;

      setToast({
        id: toastId(),
        type: 'success',
        title: t('household.memberRemoved'),
        message: t('household.memberRemovedMessage', {
          name: memberToRemove.display_name,
        }),
      });

      // Refresh member list
      loadHouseholdData();
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('household.failedToRemove'),
        message: e.message,
      });
    }
  }

  async function leaveHousehold() {
    if (isDemoMode) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('household.demoMode'),
        message: t('household.cannotLeaveDemo'),
      });
      return;
    }

    try {
      // Delete from household_members
      const { error: memErr } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', profile.household_id)
        .eq('user_id', user.id);

      if (memErr) throw memErr;

      // Update profile to remove household association
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ household_id: null })
        .eq('user_id', user.id);

      if (profErr) throw profErr;

      setToast({
        id: toastId(),
        type: 'success',
        title: t('household.leftHousehold'),
        message: t('household.leftHouseholdMessage'),
      });

      // Refresh profile to update UI
      await refreshProfile();
    } catch (e) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('household.failedToLeave'),
        message: e.message,
      });
    }
  }

  if (loading) {
    return <SkeletonCard />;
  }

  if (!household) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate" />
          <CardTitle>{t('household.householdMembers')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Household name */}
        <div className="text-sm text-stone">
          <span className="font-medium text-charcoal">{household.name}</span>
        </div>

        {/* Join code */}
        <div className="flex items-center gap-2 p-3 bg-white/50 rounded-xl border border-white/60">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-warm-gray mb-1">
              {t('household.shareCodePrompt')}
            </div>
            <code className="font-mono text-sm tracking-wider text-charcoal">
              {household.join_code}
            </code>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyJoinCode}
            className="shrink-0"
            aria-label={
              copied ? t('household.codeCopied') : t('household.copyCode')
            }
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" aria-hidden="true" />
            ) : (
              <Copy className="w-4 h-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Members list */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-warm-gray uppercase tracking-wide">
            {t('household.members')} ({members.length})
          </div>
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center gap-3 p-3 bg-white/40 rounded-xl border border-white/60"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate to-slate-light flex items-center justify-center text-white text-sm font-semibold">
                {member.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-charcoal text-sm">
                  {member.display_name}
                  {member.is_current_user && (
                    <span className="ml-2 text-xs text-slate">
                      {t('household.youTag')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-warm-gray">
                  {t('household.joined', {
                    date: new Date(member.created_at).toLocaleDateString(),
                  })}
                </div>
              </div>
              {!member.is_current_user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveClick(member)}
                  className="shrink-0 text-error hover:text-error hover:bg-error/10"
                  aria-label={t('household.removeMember')}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Leave Household button */}
        <Button
          variant="outline"
          onClick={() => setLeaveConfirmOpen(true)}
          className="w-full text-error border-error/30 hover:bg-error/10 hover:text-error"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('household.leaveHousehold')}
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setMemberToRemove(null);
        }}
        onConfirm={removeMember}
        title={t('household.removeMemberTitle')}
        message={t('household.removeMemberConfirm', {
          name: memberToRemove?.display_name || '',
        })}
        confirmText={t('household.removeMember')}
        cancelText={t('common.cancel')}
        variant="danger"
      />

      <ConfirmDialog
        open={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={leaveHousehold}
        title={t('household.leaveHouseholdTitle')}
        message={t('household.leaveHouseholdConfirm')}
        confirmText={t('household.leaveHousehold')}
        cancelText={t('common.cancel')}
        variant="danger"
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Card>
  );
}
