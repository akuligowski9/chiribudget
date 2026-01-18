'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLanguage } from '@/contexts/LanguageContext';
import { defaultLocale } from '@/i18n/config';
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';

const messages = {
  en: enMessages,
  es: esMessages,
};

export function IntlProvider({ children }) {
  const { locale, isLoaded } = useLanguage();

  // Always render with a valid locale (use default while loading)
  // This prevents the "context not found" error
  const activeLocale = isLoaded ? locale : defaultLocale;

  return (
    <NextIntlClientProvider
      locale={activeLocale}
      messages={messages[activeLocale]}
    >
      {children}
    </NextIntlClientProvider>
  );
}
