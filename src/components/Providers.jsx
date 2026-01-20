'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { IntlProvider } from '@/i18n/IntlProvider';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <OfflineProvider>
        <LanguageProvider>
          <IntlProvider>{children}</IntlProvider>
        </LanguageProvider>
      </OfflineProvider>
    </AuthProvider>
  );
}
