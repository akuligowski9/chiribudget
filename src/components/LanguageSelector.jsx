'use client';

import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-slate" />
          <CardTitle>{t('languagePreference')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
