'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getDemoMode } from '@/lib/auth';
import { FX_USD_TO_PEN } from '@/lib/categories';
import { getDemoCategoryLimits } from '@/lib/demoStore';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

// Demo mode payer options
const DEMO_PAYERS = ['Partner 1', 'Partner 2', 'Together'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]); // Household members with display names
  const [conversionRate, setConversionRate] = useState(FX_USD_TO_PEN);
  const [categoryLimits, setCategoryLimits] = useState({});
  const [loading, setLoading] = useState(true);
  // Track current user ID without triggering re-renders
  const userIdRef = useRef(null);

  useEffect(() => {
    // Skip auth in demo mode
    if (getDemoMode()) {
      setCategoryLimits(getDemoCategoryLimits());
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadUserData() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData?.user ?? null;

        if (!mounted) return;
        setUser(currentUser);
        userIdRef.current = currentUser?.id ?? null;

        if (currentUser) {
          // Load profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (!mounted) return;
          setProfile(profileData || null);

          // Load household if profile has one
          if (profileData?.household_id) {
            const { data: householdData } = await supabase
              .from('households')
              .select('*')
              .eq('id', profileData.household_id)
              .single();

            if (!mounted) return;
            setHousehold(householdData || null);

            // Load household members with their display names
            const { data: membersData } = await supabase
              .from('household_members')
              .select('user_id, profiles(display_name)')
              .eq('household_id', profileData.household_id);

            if (!mounted) return;
            const memberNames = (membersData || [])
              .map((m) => m.profiles?.display_name)
              .filter(Boolean);
            setMembers(memberNames);

            // Load conversion rate and category limits from budget_config
            const { data: configData } = await supabase
              .from('budget_config')
              .select('fx_usd_to_pen, category_limits')
              .eq('household_id', profileData.household_id)
              .maybeSingle();

            if (!mounted) return;
            if (configData?.fx_usd_to_pen) {
              setConversionRate(configData.fx_usd_to_pen);
            }
            if (configData?.category_limits) {
              setCategoryLimits(configData.category_limits);
            }
          }
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUserData();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);

      if (!newUser) {
        // User logged out
        setProfile(null);
        setHousehold(null);
        setMembers([]);
        userIdRef.current = null;
      } else if (newUser.id !== userIdRef.current) {
        // User changed, reload profile
        userIdRef.current = newUser.id;
        loadUserData();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setHousehold(null);
    setMembers([]);
    setConversionRate(FX_USD_TO_PEN);
    setCategoryLimits({});
  }

  // Compute payer options from household members
  // If 2+ members, add "Together" as an option
  const payerOptions = getDemoMode()
    ? DEMO_PAYERS
    : members.length >= 2
      ? [...members, 'Together']
      : members;

  async function sendMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error };
  }

  function refreshProfile() {
    // Force reload of profile/household data after setup
    if (user) {
      setLoading(true);
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data: profileData }) => {
          setProfile(profileData || null);
          if (profileData?.household_id) {
            return supabase
              .from('households')
              .select('*')
              .eq('id', profileData.household_id)
              .single();
          }
          return { data: null };
        })
        .then(({ data: householdData }) => {
          setHousehold(householdData || null);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }

  async function refreshConversionRate() {
    // Reload conversion rate from budget_config after settings change
    if (profile?.household_id) {
      const { data: configData } = await supabase
        .from('budget_config')
        .select('fx_usd_to_pen')
        .eq('household_id', profile.household_id)
        .maybeSingle();

      if (configData?.fx_usd_to_pen) {
        setConversionRate(configData.fx_usd_to_pen);
      }
    }
  }

  async function refreshCategoryLimits() {
    // Reload category limits from budget_config after settings change
    if (getDemoMode()) {
      setCategoryLimits(getDemoCategoryLimits());
      return;
    }

    if (profile?.household_id) {
      const { data: configData } = await supabase
        .from('budget_config')
        .select('category_limits')
        .eq('household_id', profile.household_id)
        .maybeSingle();

      if (configData?.category_limits) {
        setCategoryLimits(configData.category_limits);
      } else {
        setCategoryLimits({});
      }
    }
  }

  const value = {
    user,
    profile,
    household,
    members,
    payerOptions,
    conversionRate,
    categoryLimits,
    loading,
    signOut,
    sendMagicLink,
    refreshProfile,
    refreshConversionRate,
    refreshCategoryLimits,
    isAuthenticated: !!user,
    hasHousehold: !!profile?.household_id,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
