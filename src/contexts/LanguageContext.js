'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { defaultLocale, locales } from '@/i18n/config';

const STORAGE_KEY = 'chiribudget_language';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(defaultLocale);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load language preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales.includes(stored)) {
      setLocaleState(stored);
    }
    setIsLoaded(true);
  }, []);

  function setLocale(newLocale) {
    if (locales.includes(newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem(STORAGE_KEY, newLocale);
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
