'use client';

import { Flame, Info, Share2 } from 'lucide-react';
import Image from 'next/image';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { Figure } from '@/lib/types';

function FigureDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-16">
      <Card className="overflow-hidden">
        <CardHeader className="p-6 md:p-8">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 flex-shrink-0 rounded-full md:h-32 md:w-32" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-3/4" />
            </div>
          </div>
        </CardHeader>
      </Card>
      <div className="mt-6">
        <Skeleton className="h-10 w-full" />
        <Card className="mt-4">
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FigureDetailClient({ figureId }: { figureId: string }) {
  const firestore = useFirestore();

  const figureDocRef = useMemoFirebase(() => {
    if (!firestore || !figureId) return null;
    return doc(firestore, 'figures', figureId);
  }, [firestore, figureId]);

  const { data: figure, isLoading } = useDoc<Figure>(figureDocRef);

  if (isLoading || !figure) {
    return <FigureDetailSkeleton />;
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-16">
      <Card className="overflow-hidden">
        <CardHeader className="p-6 md:p-8">
          <div className="relative flex items-center gap-6">
            <div className="relative h-24 w-24 flex-shrink-0 md:h-32 md:w-32">
              <Image
                src={figure.imageUrl}
                alt={figure.name}
                fill
                className="rounded-full border-4 border-card object-cover shadow-lg"
                data-ai-hint={figure.imageHint}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl font-headline">
                {figure.name}
              </h1>
            </div>
            <div className="absolute right-0 top-0">
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="mt-6">
        <Tabs defaultValue="actitud" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="informacion">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Información
            </TabsTrigger>
            <TabsTrigger value="actitud">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              Actitud
            </TabsTrigger>
            <TabsTrigger value="emocion">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Emoción
            </TabsTrigger>
            <TabsTrigger value="rachas">
                 <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7.014a12.83 12.83 0 00-2.122 3.164A8.003 8.003 0 016.343 7.343c-2.286 2.286-2.286 6.014 0 8.3s6.014 2.286 8.3 0c.343-.343.636-.724.886-1.129a12.89 12.89 0 003.163-2.122C17.5 16 14 15.5 12 15c1 2 2.657 1.657 2.657 1.657z"></path></svg>
              Top Rachas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="informacion" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  Información sobre {figure.name} aparecerá aquí.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="actitud" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  La votación de actitud para {figure.name} aparecerá aquí.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="emocion" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  El análisis de emociones para {figure.name} aparecerá aquí.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="rachas" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  Las mejores rachas para {figure.name} aparecerán aquí.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
