'use client';

import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardContent,
  useCollapsible,
} from '@/components/ui/collapsible-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { localeNames, locales } from '@/i18n/config';

export default function LanguageSelector() {
  const t = useTranslations('settings');
  const { locale, setLocale } = useLanguage();
  const { isOpen, toggle } = useCollapsible(false);

  return (
    <CollapsibleCard>
      <CollapsibleCardHeader
        icon={Globe}
        title={t('languagePreference')}
        isOpen={isOpen}
        onToggle={toggle}
      />
      <CollapsibleCardContent isOpen={isOpen}>
        <div className="space-y-1.5 max-w-xs">
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locales.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {localeNames[loc]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
