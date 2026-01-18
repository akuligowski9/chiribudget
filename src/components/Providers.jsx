'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { IntlProvider } from '@/i18n/IntlProvider';

export default function Providers({ children }) {
  return (
    <LanguageProvider>
      <IntlProvider>
        <AuthProvider>{children}</AuthProvider>
      </IntlProvider>
    </LanguageProvider>
  );
}
