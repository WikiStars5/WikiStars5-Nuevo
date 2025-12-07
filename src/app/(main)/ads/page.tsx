
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';
import Link from 'next/link';

export default function AdsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
            <Megaphone className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Panel de Anuncios</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Bienvenido a tu centro de control publicitario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p>
            Esta sección está en construcción. Aquí podrás crear, gestionar y analizar el rendimiento de tus campañas publicitarias en WikiStars5.
          </p>
          <p className="font-semibold">
            ¡Vuelve pronto para descubrir las nuevas funcionalidades!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

    