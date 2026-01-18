'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLanguage } from '@/contexts/LanguageContext';
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';

const messages = {
  en: enMessages,
  es: esMessages,
};

export function IntlProvider({ children }) {
  const { locale, isLoaded } = useLanguage();

  // Wait for locale to load from localStorage
  if (!isLoaded) {
    return null;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
