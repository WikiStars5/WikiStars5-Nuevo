'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';

export default function DisclaimerPage() {
  const { t } = useLanguage();
  
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">{t('DisclaimerPage.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            <strong>{t('DisclaimerPage.paragraphs.1_strong')}</strong>
            {t('DisclaimerPage.paragraphs.1')}
          </p>
          <p>
            <strong>{t('DisclaimerPage.paragraphs.2_strong')}</strong>
            {t('DisclaimerPage.paragraphs.2')}
          </p>
          <p>
            <strong>{t('DisclaimerPage.paragraphs.3_strong')}</strong>
            {t('DisclaimerPage.paragraphs.3')}
          </p>
          <p>
            {t('DisclaimerPage.paragraphs.4')}
          </p>
          <p>
            <strong>{t('DisclaimerPage.paragraphs.5_strong')}</strong>
            {t('DisclaimerPage.paragraphs.5')}
          </p>
          <p>
            <strong>{t('DisclaimerPage.paragraphs.6_strong')}</strong>
            {t('DisclaimerPage.paragraphs.6')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
