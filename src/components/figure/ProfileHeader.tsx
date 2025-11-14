'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Figure, GoatBattle } from '@/lib/types';
import PersonalStreak from '../streaks/personal-streak';
import { ShareButton } from '../shared/ShareButton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSearchParams } from 'next/navigation';

interface ProfileHeaderProps {
  figure: Figure;
  figureId: string;
}

const GOAT_ICON_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/goat%2FGOAT2.png?alt=media&token=50973a60-0bff-4fcb-9c17-986f067d834e";

export default function ProfileHeader({ figure, figureId }: ProfileHeaderProps) {
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const battleDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'goat_battles', 'messi-vs-ronaldo');
  }, [firestore]);

  const { data: battleData } = useDoc<GoatBattle>(battleDocRef);
  
  const isGoatCandidate = figure.name === 'Lionel Messi' || figure.name === 'Cristiano Ronaldo';
  const battleWinner = battleData?.winner;
  const isWinner = 
    isGoatCandidate &&
    battleWinner &&
    ((figure.name === 'Lionel Messi' && battleWinner === 'messi') || 
     (figure.name === 'Cristiano Ronaldo' && battleWinner === 'ronaldo'));

  const isGoatTab = searchParams.get('tab') === 'goat';

  return (
    <Card className="overflow-hidden shadow-md dark:bg-black">
      <CardContent className="relative p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
          <div className="relative flex-shrink-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-28 w-28 md:h-36 md:w-36 rounded-full border-4 border-card p-0 shadow-lg cursor-pointer">
                    <Image
                        src={figure.imageUrl || `https://placehold.co/400x400?text=${encodeURIComponent(figure.name)}`}
                        alt={figure.name}
                        fill
                        className="rounded-full object-cover"
                        data-ai-hint={figure.imageHint}
                    />
                </Button>
              </DialogTrigger>
              <DialogContent className="p-2 bg-transparent border-0 max-w-4xl h-screen flex items-center justify-center">
                 <DialogHeader className="sr-only">
                    <DialogTitle>Imagen de perfil de {figure.name}</DialogTitle>
                    <DialogDescription>Una vista ampliada de la imagen de perfil.</DialogDescription>
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
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-headline">
                {figure.name}
              </h1>
              {isWinner && (
                <Image 
                  src={GOAT_ICON_URL}
                  alt="GOAT Icon"
                  width={40}
                  height={40}
                  className="h-10 w-10"
                />
              )}
            </div>
            <div className="mt-2 flex justify-center md:justify-start">
              <PersonalStreak figureId={figureId} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
