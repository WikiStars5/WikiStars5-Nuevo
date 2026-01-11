'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ElectionsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Elecciones 2026</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta página está en construcción. Vuelve pronto para más información sobre las Elecciones 2026.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
