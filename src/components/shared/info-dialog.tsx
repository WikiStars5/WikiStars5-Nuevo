'use client';

import * as React from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/context/LanguageContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, CheckCircle, Shield, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function InfoDialog() {
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
    <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
      <DialogHeader className="p-6 pb-2">
        <DialogTitle className="text-2xl font-headline flex items-center gap-2">
          <Info className="text-primary" />
          Información Institucional
        </DialogTitle>
        <DialogDescription>
          Documentación legal, reglas y estado de la plataforma WikiStars5.
        </DialogDescription>
      </DialogHeader>
      
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="space-y-8 py-4">
          {/* Section: Beta */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Versión Beta
            </h3>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>¿Qué significa que estamos en "Beta"?</AlertTitle>
              <AlertDescription>
                Significa que nuestra plataforma está en desarrollo activo. Es funcional y emocionante, pero todavía estamos ajustando detalles.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estás utilizando una versión temprana de WikiStars5. Estamos trabajando constantemente para añadir nuevas funcionalidades y pulir la experiencia general. Tu feedback es fundamental en este proceso.
            </p>
          </section>

          <Separator />

          {/* Section: Rules */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Reglas de la Comunidad
            </h3>
            <ul className="space-y-3">
              {rulesKeys.map((ruleKey, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>{t(`RulesPage.${ruleKey}`)}</span>
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          {/* Section: Privacy */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Política de Privacidad
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>{t('PrivacyPolicyPage.sections.1.content')}</p>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">{t('PrivacyPolicyPage.sections.2.title')}</p>
                <p>{t('PrivacyPolicyPage.sections.2.intro')}</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section: Disclaimer */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Descargo de Responsabilidad
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed italic">
              <p>
                <strong>{t('DisclaimerPage.paragraphs.1_strong')}</strong>
                {t('DisclaimerPage.paragraphs.1')}
              </p>
              <p>
                <strong>{t('DisclaimerPage.paragraphs.2_strong')}</strong>
                {t('DisclaimerPage.paragraphs.2')}
              </p>
            </div>
          </section>
        </div>
      </ScrollArea>
    </DialogContent>
  );
}
