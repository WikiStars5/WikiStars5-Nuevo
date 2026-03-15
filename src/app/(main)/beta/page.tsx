'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function BetaPage() {
  const { t } = useLanguage();
  
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Versión Beta de Starryz5</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>¿Qué significa que estamos en "Beta"?</AlertTitle>
            <AlertDescription>
              Significa que nuestra plataforma es como un auto de carreras recién ensamblado: es funcional y emocionante, pero todavía estamos en la pista de pruebas ajustando los tornillos.
            </AlertDescription>
          </Alert>
          
          <p>
            Estás utilizando una versión temprana de Starryz5. Todas las características principales que ves están activas y funcionales, pero esto es solo el comienzo. Estar en fase "Beta" significa que:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li><strong>Desarrollo Activo:</strong> Estamos trabajando constantemente para añadir nuevas funcionalidades, mejorar las existentes y pulir la experiencia general.</li>
            <li><strong>Posibles Errores:</strong> Aunque hacemos nuestro mejor esfuerzo, es posible que encuentres algunos bugs o comportamientos inesperados. ¡Somos humanos!</li>
            <li><strong>Tu Opinión es Oro:</strong> Esta es la etapa donde tu feedback es más valioso. Si algo no funciona como esperas o tienes una idea genial, nos encantaría saberlo. Eres parte fundamental del proceso de construcción.</li>
          </ul>
          <p>
            Gracias por ser uno de nuestros primeros usuarios y por ayudarnos a construir la mejor plataforma de opinión sobre figuras públicas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}