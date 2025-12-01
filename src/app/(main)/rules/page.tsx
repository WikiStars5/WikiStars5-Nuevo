'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function RulesPage() {
  const { t } = useLanguage();

  const rulesKeys = [
    'rules.0',
    'rules.1',
    'rules.2',
    'rules.3',
    'rules.4',
    'rules.5',
    'rules.6',
  ];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">{t('RulesPage.title')}</CardTitle>
          <p className="text-muted-foreground pt-2">{t('RulesPage.description')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {rulesKeys.map((ruleKey, index) => (
                <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <span>{t(`RulesPage.${ruleKey}`)}</span>
                </li>
            ))}
          </ul>
           <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                    {t('RulesPage.conclusion')}
                </p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
