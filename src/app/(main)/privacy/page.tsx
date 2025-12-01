'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';

export default function PrivacyPolicyPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">{t('PrivacyPolicyPage.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('PrivacyPolicyPage.sections.1.title')}</h2>
            <p>
              {t('PrivacyPolicyPage.sections.1.content')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('PrivacyPolicyPage.sections.2.title')}</h2>
            <div className="space-y-3">
              <p>{t('PrivacyPolicyPage.sections.2.intro')}</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>
                  <strong>{t('PrivacyPolicyPage.sections.2.points.0.strong')}</strong>
                  {t('PrivacyPolicyPage.sections.2.points.0.text')}
                </li>
                <li>
                  <strong>{t('PrivacyPolicyPage.sections.2.points.1.strong')}</strong>
                  {t('PrivacyPolicyPage.sections.2.points.1.text')}
                </li>
                <li>
                  <strong>{t('PrivacyPolicyPage.sections.2.points.2.strong')}</strong>
                  {t('PrivacyPolicyPage.sections.2.points.2.text')}
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('PrivacyPolicyPage.sections.3.title')}</h2>
            <p>
              {t('PrivacyPolicyPage.sections.3.intro')}
            </p>
             <ul className="list-disc list-inside space-y-2 pl-4 mt-3">
                <li>{t('PrivacyPolicyPage.sections.3.points.0')}</li>
                <li>{t('PrivacyPolicyPage.sections.3.points.1')}</li>
                <li>{t('PrivacyPolicyPage.sections.3.points.2')}</li>
                <li>{t('PrivacyPolicyPage.sections.3.points.3')}</li>
              </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('PrivacyPolicyPage.sections.4.title')}</h2>
             <div className="space-y-3">
                <p>
                    {t('PrivacyPolicyPage.sections.4.intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>
                      <strong>{t('PrivacyPolicyPage.sections.4.points.0.strong')}</strong>
                      {t('PrivacyPolicyPage.sections.4.points.0.text')}
                    </li>
                    <li>
                      <strong>{t('PrivacyPolicyPage.sections.4.points.1.strong')}</strong>
                      {t('PrivacyPolicyPage.sections.4.points.1.text')}
                    </li>
                    <li>
                      <strong>{t('PrivacyPolicyPage.sections.4.points.2.strong')}</strong>
                      {t('PrivacyPolicyPage.sections.4.points.2.text')}
                    </li>
                </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('PrivacyPolicyPage.sections.5.title')}</h2>
            <p>
              {t('PrivacyPolicyPage.sections.5.intro')}
            </p>
             <ul className="list-disc list-inside space-y-2 pl-4 mt-3">
                <li>{t('PrivacyPolicyPage.sections.5.points.0')}</li>
                <li>{t('PrivacyPolicyPage.sections.5.points.1')}</li>
              </ul>
              <p>{t('PrivacyPolicyPage.sections.5.outro')}</p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
