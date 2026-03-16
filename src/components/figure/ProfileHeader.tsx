'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import type { Figure, GoatBattle } from '@/lib/types';
import PersonalStreak from '../streaks/personal-streak';
import { ShareButton } from '../shared/ShareButton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSearchParams } from 'next/navigation';
import AttitudeVoting from './attitude-voting';
import { useCallback, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface ProfileHeaderProps {
  figure: Figure;
  figureId: string;
}

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

export default function ProfileHeader({ figure, figureId }: ProfileHeaderProps) {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const [commentSortPreference, setCommentSortPreference] = useState<AttitudeOption | null>(null);
  const { theme } = useTheme();

  const battleDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'goat_battles', 'messi-vs-ronaldo');
  }, [firestore]);

  const { data: battleData } = useDoc<GoatBattle>(battleDocRef);
  
  const isGoatTab = searchParams.get('tab') === 'goat';
  
  const handleVote = useCallback((attitude: AttitudeOption | null) => {
    setCommentSortPreference(attitude);
  }, []);

  return (
    <Card className={cn("overflow-hidden shadow-md border-0 md:border md:rounded-lg", (theme === 'dark' || theme === 'army') && 'bg-black')}>
      <Dialog>
        <DialogTrigger asChild>
          <div className="relative h-48 md:h-64 bg-muted cursor-pointer">
            {figure.coverPhotoUrl ? (
                <Image
                    src={figure.coverPhotoUrl}
                    alt={`Portada ${figure.name}`}
                    fill
                    className="object-cover"
                    priority
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
                    <p className="text-muted-foreground text-sm font-medium">Sin foto de portada</p>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>
        </DialogTrigger>
        <DialogContent className="p-2 bg-transparent border-0 max-w-5xl h-screen flex items-center justify-center">
            <DialogHeader className="sr-only">
              <DialogTitle>Portada de {figure.name}</DialogTitle>
              <DialogDescription>Vista ampliada de la portada.</DialogDescription>
            </DialogHeader>
            <div className="relative w-full h-full max-h-[90vh]">
              <Image
                  src={figure.coverPhotoUrl || `https://placehold.co/1200x600?text=${encodeURIComponent(figure.name)}`}
                  alt={figure.name}
                  fill
                  className="rounded-lg object-contain"
              />
            </div>
        </DialogContent>
      </Dialog>

      <CardContent className="relative p-6 md:p-8 pt-0">
         <div className="absolute top-4 right-4 z-10">
          <ShareButton 
            figureId={figureId} 
            figureName={figure.name}
            isGoatShare={isGoatTab}
            showText={false}
          />
        </div>
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
          <div className="relative flex-shrink-0 -mt-16 md:-mt-20 h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-card shadow-lg overflow-hidden bg-black">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative w-full h-full cursor-pointer">
                    <Image
                        src={figure.imageUrl || `https://placehold.co/400x400?text=${encodeURIComponent(figure.name)}`}
                        alt={figure.name}
                        fill
                        className="object-cover"
                        data-ai-hint={figure.imageHint}
                        priority
                    />
                </div>
              </DialogTrigger>
              <DialogContent className="p-2 bg-transparent border-0 max-w-4xl h-screen flex items-center justify-center">
                 <DialogHeader className="sr-only">
                    <DialogTitle>Foto de {figure.name}</DialogTitle>
                    <DialogDescription>Vista ampliada.</DialogDescription>
                 </DialogHeader>
                 <div className="relative w-full h-full max-h-[90vh]">
                    <Image
                        src={figure.imageUrl || `https://placehold.co/800x800?text=${encodeURIComponent(figure.name)}`}
                        alt={figure.name}
                        fill
                        className="rounded-lg object-contain"
                    />
                 </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex-1 w-full text-center md:text-left space-y-3 md:mt-2">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-headline">
              {figure.name}
            </h1>
            <div className="flex justify-center md:justify-start">
              <PersonalStreak figureId={figureId} />
            </div>
            <div className="pt-2">
              <AttitudeVoting figure={figure} onVote={handleVote} variant="header" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}