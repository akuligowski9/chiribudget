'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { defaultLocale, locales } from '@/i18n/config';
import { supabase } from '@/lib/supabaseClient';

const STORAGE_KEY = 'chiribudget_language';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [locale, setLocaleState] = useState(defaultLocale);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load language preference on mount and when profile changes
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // If user is logged in and has a profile with preferred_language, use it
    if (user && profile?.preferred_language) {
      const profileLang = profile.preferred_language;
      if (locales.includes(profileLang)) {
        setLocaleState(profileLang);
        // Also update localStorage to keep in sync
        localStorage.setItem(STORAGE_KEY, profileLang);
      }
      setIsLoaded(true);
      return;
    }

    // Fall back to localStorage for anonymous/demo users
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales.includes(stored)) {
      setLocaleState(stored);
    }
    setIsLoaded(true);
  }, [authLoading, user, profile?.preferred_language]);

  async function setLocale(newLocale) {
    if (!locales.includes(newLocale)) return;

    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);

    // If user is logged in, save to their profile
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ preferred_language: newLocale })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  }

  const value = {
    locale,
    setLocale,
    isLoaded,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
