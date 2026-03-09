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

export type InfoSection = 'beta' | 'rules' | 'privacy' | 'disclaimer';

interface InfoDialogProps {
  section: InfoSection;
}

/**
 * Component that renders specific institutional information based on the selected section.
 */
export default function InfoDialog({ section }: InfoDialogProps) {
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

  const renderContent = () => {
    switch (section) {
      case 'beta':
        return (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>¿Qué significa que estamos en "Beta"?</AlertTitle>
              <AlertDescription>
                Significa que nuestra plataforma es como un auto de carreras recién ensamblado: es funcional y emocionante, pero todavía estamos en la pista de pruebas ajustando los tornillos.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
              <p>
                Estás utilizando una versión temprana de WikiStars5. Todas las características principales que ves están activas y funcionales, pero esto es solo el comienzo. Estar en fase "Beta" significa que:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>Desarrollo Activo:</strong> Estamos trabajando constantemente para añadir nuevas funcionalidades, mejorar las existentes y pulir la experiencia general.</li>
                <li><strong>Posibles Errores:</strong> Aunque hacemos nuestro mejor esfuerzo, es posible que encuentres algunos bugs o comportamientos inesperados. ¡Somos humanos!</li>
                <li><strong>Tu Opinión es Oro:</strong> Esta es la etapa donde tu feedback es más valioso. Si algo no funciona como esperas o tienes una idea genial, nos encantaría saberlo. Eres parte fundamental del proceso de construcción.</li>
              </ul>
              <p>
                Gracias por ser uno de nuestros primeros usuarios y por ayudarnos a construir la mejor plataforma de opinión sobre figuras públicas.
              </p>
            </div>
          </div>
        );
      case 'rules':
        return (
          <div className="space-y-4">
            <ul className="space-y-3">
              {rulesKeys.map((ruleKey, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>{t(`RulesPage.${ruleKey}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>{t('PrivacyPolicyPage.sections.1.content')}</p>
            <div className="space-y-2 border-t pt-4">
              <p className="font-semibold text-foreground">{t('PrivacyPolicyPage.sections.2.title')}</p>
              <p>{t('PrivacyPolicyPage.sections.2.intro')}</p>
            </div>
          </div>
        );
      case 'disclaimer':
        return (
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
        );
    }
  };

  const getTitle = () => {
    switch (section) {
      case 'beta': return 'Versión Beta de WikiStars5';
      case 'rules': return 'Reglas de la Comunidad';
      case 'privacy': return 'Política de Privacidad';
      case 'disclaimer': return 'Aviso Legal';
    }
  };

  const getIcon = () => {
    switch (section) {
      case 'beta': return <Info className="text-primary" />;
      case 'rules': return <CheckCircle className="text-primary" />;
      case 'privacy': return <Shield className="text-primary" />;
      case 'disclaimer': return <FileText className="text-primary" />;
    }
  };

  return (
    <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col p-0 overflow-hidden dark:bg-black">
      <DialogHeader className="p-6 pb-2">
        <DialogTitle className="text-2xl font-headline flex items-center gap-2">
          {getIcon()}
          {getTitle()}
        </DialogTitle>
      </DialogHeader>
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="py-4">
          {renderContent()}
        </div>
      </ScrollArea>
    </DialogContent>
  );
}
