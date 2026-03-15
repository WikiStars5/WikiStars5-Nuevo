'use client';

import * as React from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useLanguage } from '@/context/LanguageContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, CheckCircle, Shield, FileText } from 'lucide-react';

export type InfoSection = 'beta' | 'rules' | 'privacy' | 'disclaimer';

interface InfoDialogProps {
  section: InfoSection;
}

/**
 * Component that renders specific institutional information based on the selected section.
 * Re-structured to ensure proper scrolling on all devices.
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
                Estás utilizando una versión temprana de Starryz5. Todas las características principales que ves están activas y funcionales, pero esto es solo el comienzo. Estar en fase "Beta" significa que:
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
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('RulesPage.description')}
            </p>
            <ul className="space-y-4">
              {rulesKeys.map((ruleKey, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-foreground/90">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{t(`RulesPage.${ruleKey}`)}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground pt-6 border-t leading-relaxed">
              {t('RulesPage.conclusion')}
            </p>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h3 className="font-bold text-foreground text-base mb-2">1. Introducción</h3>
              <p>Bienvenido a Starryz5. Tu privacidad es de suma importancia para nosotros. Esta Política de Privacidad explica qué datos recopilamos, por qué los recopilamos y cómo puedes ver y gestionar tu información.</p>
            </section>

            <section>
              <h3 className="font-bold text-foreground text-base mb-2">2. Qué Información Recopilamos</h3>
              <p className="mb-2">Recopilamos información para proporcionar y mejorar nuestros servicios. Esto incluye:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Información que nos proporcionas:</strong> Al registrarte con Google, nos proporcionas tu nombre, dirección de correo electrónico y foto de perfil. También puedes añadir voluntariamente en tu perfil un nombre de usuario, país, sexo y una breve descripción.</li>
                <li><strong>Contenido que generas:</strong> Recopilamos el contenido que creas en nuestra plataforma, como los comentarios que publicas, los votos de actitud y emoción que emites y las rachas que generas. Esta información es pública por naturaleza.</li>
                <li><strong>Información de Actividad:</strong> Recopilamos información sobre tu actividad en nuestro servicio, como tu estado en línea (online/offline), para mejorar la experiencia de la comunidad.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-foreground text-base mb-2">3. Por Qué Recopilamos Datos</h3>
              <p className="mb-2">Utilizamos la información que recopilamos para los siguientes propósitos:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Proporcionar nuestros servicios: Para operar las funciones principales de Starryz5, como mostrar tu perfil público, tus comentarios, votos y rachas.</li>
                <li>Mantener y mejorar nuestros servicios: Para entender cómo se utiliza nuestra plataforma y poder mejorarla.</li>
                <li>Comunicarnos contigo: Para enviarte notificaciones importantes, como respuestas a tus comentarios.</li>
                <li>Proteger nuestra plataforma y a nuestros usuarios: Usamos la información para ayudar a mejorar la seguridad y fiabilidad de nuestros servicios.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-foreground text-base mb-2">4. Compartir tu Información</h3>
              <p className="mb-2">No compartimos tu información personal con empresas, organizaciones o individuos fuera de Starryz5, excepto en los siguientes casos:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Contenido público:</strong> Tu nombre de usuario, tu foto de perfil (si la tienes) e todo el contenido que generas (comentarios, votos, etc.) son visibles públicamente para otros usuarios de la plataforma.</li>
                <li><strong>Proveedores de servicios:</strong> Utilizamos Google Firebase para la autenticación, base de datos y alojamiento. Google tiene sus propias políticas de privacidad que rigen cómo procesan los datos.</li>
                <li><strong>Por razones legales:</strong> Compartiremos información personal si creemos de buena fe que el acceso, uso, preservación o divulgación de la información es razonablemente necesario para cumplir con la ley aplicable, regulación, proceso legal o solicitud gubernamental exigible.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-foreground text-base mb-2">5. Tus Controles de Privacidad</h3>
              <p className="mb-2">Tienes control sobre la información que proporcionas y tu actividad. Desde tu página de perfil, puedes:</p>
              <ul className="list-disc pl-5 space-y-2 mb-4">
                <li>Ver y editar la información de tu perfil, como tu nombre de usuario, país, sexo y descripción.</li>
                <li>Ver un resumen de tu actividad, incluyendo tus votos y rachas.</li>
              </ul>
              <p>Si deseas eliminar tu cuenta y toda la información asociada, por favor, contáctanos.</p>
            </section>
          </div>
        );
      case 'disclaimer':
        return (
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h3 className="font-bold text-foreground text-base mb-2">Naturaleza del Sitio</h3>
              <p>Starryz5 es una plataforma de opinión y entretenimiento. Creemos firmemente en la libertad de expresión y nuestro propósito es permitir que los usuarios expresen y discutan libremente sus percepciones sobre figuras públicas. El contenido de este sitio, incluyendo las calificaciones, votos, y comentarios, representa las opiniones subjetivas de nuestros usuarios y no debe ser interpretado como una declaración de hechos.</p>
            </section>

            <section>
              <h3 className="font-bold text-foreground text-base mb-2">Reflejo de la Percepción Pública</h3>
              <p>Las percepciones, ya sean de admiración u odio, que se reflejan en esta plataforma son el resultado de las acciones y la reputación de las propias figuras públicas. Starryz5 no crea ni controla estas opiniones; simplemente actúa como un foro para su expresión. La responsabilidad de la imagen pública recae enteramente en la figura pública, no en la plataforma que permite la discusión sobre ella. En resumen: <strong>no es nuestra culpa si te haces odiar o amar; esa responsabilidad es completamente tuya y no está bajo nuestro control.</strong></p>
            </section>

            <section>
              <h3 className="font-bold text-foreground text-base mb-2">Sin Afiliación ni Respaldo</h3>
              <p>Este sitio web no está afiliado, asociado, autorizado, respaldado por, ni de ninguna manera conectado oficialmente con ninguna de las figuras públicas mencionadas en él, ni con ninguna de sus subsidiarias o afiliadas.</p>
              <p className="mt-2 italic">Los nombres, así como cualquier imagen, marca registrada y derecho de autor relacionados, son propiedad de sus respectivos dueños. El uso de estos nombres e imágenes tiene fines de identificación, comentario y crítica, en el marco del derecho a la libertad de expresión.</p>
            </section>

            <section>
              <h3 className="font-bold text-foreground text-base mb-2">Contenido Generado por el Usuario</h3>
              <p>Todo el contenido generado por los usuarios, como comentarios y votos, es responsabilidad exclusiva de la persona que lo publica. Starryz5 no se hace responsable de la exactitud, veracidad o legalidad de dicho contenido. Nos reservamos el derecho de moderar o eliminar contenido que viole nuestras políticas, pero no tenemos la obligación de hacerlo.</p>
            </section>

            <section>
              <h3 className="font-bold text-foreground text-base mb-2">Sin Fines de Lucro Directo con la Imagen</h3>
              <p>La plataforma no utiliza la imagen o el nombre de las figuras públicas para la venta directa de productos o servicios. El propósito es fomentar la discusión y el debate público.</p>
            </section>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (section) {
      case 'beta': return 'Versión Beta de Starryz5';
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
    <DialogContent className="sm:max-w-xl max-h-[90vh] w-[95vw] flex flex-col p-0 gap-0 overflow-hidden dark:bg-black border-border/40">
      <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b border-border/40">
        <DialogTitle className="text-2xl font-headline flex items-center gap-2">
          {getIcon()}
          {getTitle()}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Información institucional sobre {getTitle()}.
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
        {renderContent()}
      </div>
    </DialogContent>
  );
}