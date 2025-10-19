'use client';

import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  getEmotionVotesByFigureId,
  getRelatedFigures,
} from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Heart, ThumbsDown, Meh, UserCheck } from 'lucide-react';
import { Twitter, Instagram } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CommentSection from '@/components/figure/comment-section';
import TopStreaks from '@/components/figure/top-streaks';
import { useFirestore, useDoc } from '@/firebase';
import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function FigureDetailPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const figureId = params.id;

  const figureRef = useMemo(() => {
    if (!firestore || !figureId) return null;
    return doc(firestore, 'figures', figureId);
  }, [firestore, figureId]);

  const { data: figure, isLoading } = useDoc<any>(figureRef);

  // For now, we will keep emotion votes and related figures from mock data
  // as they are not the primary focus.
  // const emotionVotes = await getEmotionVotesByFigureId(params.id);
  // const relatedFigures = await getRelatedFigures(params.id);

  if (isLoading) {
    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <Skeleton className="h-[400px] w-full mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                    <Skeleton className="h-12 w-1/2" />
                    <Skeleton className="h-8 w-1/3" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (!figure) {
    return notFound();
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[400px] md:h-[500px] w-full">
        <Image
          src={figure.imageUrl}
          alt={figure.name}
          fill
          className="object-cover"
          priority
          data-ai-hint={figure.imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="container mx-auto px-4 absolute bottom-0 left-0 right-0 pb-8">
          <div className="flex flex-col md:flex-row md:items-end md:gap-6">
            <div className="relative -mt-24 md:mt-0 w-40 h-40 md:w-48 md:h-48 rounded-lg overflow-hidden shadow-2xl border-4 border-card shrink-0">
               <Image src={figure.imageUrl} alt={figure.name} fill className="object-cover" data-ai-hint={figure.imageHint}/>
            </div>
            <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline mt-4">{figure.name}</h1>
                <div className="flex items-center gap-4 mt-2">
                    <p className="text-lg text-muted-foreground">{figure.nationality}</p>
                    <div className="flex items-center gap-2">
                        {figure.socials?.twitter && <a href={`https://twitter.com/${figure.socials.twitter}`} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" /></a>}
                        {figure.socials?.instagram && <a href={`https://instagram.com/${figure.socials.instagram}`} target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" /></a>}
                        {figure.socials?.website && <a href={`https://${figure.socials.website}`} target="_blank" rel="noopener noreferrer"><Globe className="h-5 w-5 text-muted-foreground hovertext-primary transition-colors" /></a>}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Tabs defaultValue="actitud" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
            <TabsTrigger value="actitud">Actitud</TabsTrigger>
            <TabsTrigger value="comments">Comentarios</TabsTrigger>
            <TabsTrigger value="streaks">Rachas</TabsTrigger>
          </TabsList>

          <TabsContent value="actitud">
             <div className="grid grid-cols-1 gap-8">
                <div className="space-y-8">
                    {/* Attitude Voting - Maintenance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">Votación de Actitud <Badge variant="destructive">En Mantenimiento</Badge></CardTitle>
                            <CardDescription>¿Qué sientes por esta figura?</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            <Button variant="outline" size="lg" className="flex-1" disabled><Heart className="mr-2 h-4 w-4"/> Fan</Button>
                            <Button variant="outline" size="lg" className="flex-1" disabled><Meh className="mr-2 h-4 w-4"/> Neutral</Button>
                            <Button variant="outline" size="lg" className="flex-1" disabled><UserCheck className="mr-2 h-4 w-4"/> Seguidor</Button>
                            <Button variant="outline" size="lg" className="flex-1" disabled><ThumbsDown className="mr-2 h-4 w-4"/> Hater</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
          </TabsContent>

          <TabsContent value="comments">
             <CommentSection figureId={params.id} />
          </TabsContent>
          <TabsContent value="streaks">
             <TopStreaks figureId={params.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
