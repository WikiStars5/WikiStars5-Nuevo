'use client';

import {
  Flame,
  Heart,
  Info,
  Share2,
  Smile,
} from 'lucide-react';
import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function FigureDetailPage() {
  const firestore = useFirestore();
  const params = useParams();
  const figureId = params.id as string;

  const figureRef = useMemoFirebase(() => {
    if (!firestore || !figureId) return null;
    return doc(firestore, 'figures', figureId);
  }, [firestore, figureId]);

  const { data: figure, isLoading } = useDoc<any>(figureRef);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8 md:py-16">
        <Card className="overflow-hidden">
          <CardHeader className="p-6 md:p-8">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full md:h-32 md:w-32" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-10 w-3/4" />
              </div>
            </div>
          </CardHeader>
        </Card>
        <div className="mt-6">
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!figure) {
    return notFound();
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
              <Info className="mr-2 h-4 w-4" />
              Información
            </TabsTrigger>
            <TabsTrigger value="actitud">
              <Heart className="mr-2 h-4 w-4" />
              Actitud
            </TabsTrigger>
            <TabsTrigger value="emocion">
              <Smile className="mr-2 h-4 w-4" />
              Emoción
            </TabsTrigger>
            <TabsTrigger value="rachas">
              <Flame className="mr-2 h-4 w-4" />
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
