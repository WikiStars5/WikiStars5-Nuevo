
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Figure, GoatBattle } from '@/lib/types';
import PersonalStreak from '../streaks/personal-streak';
import { ShareButton } from '../shared/ShareButton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface ProfileHeaderProps {
  figure: Figure;
  figureId: string;
}

const GOAT_ICON_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/goat%2FGOAT2.png?alt=media&token=50973a60-0bff-4fcb-9c17-986f067d834e";

export default function ProfileHeader({ figure, figureId }: ProfileHeaderProps) {
  const firestore = useFirestore();

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

  return (
    <Card className="overflow-hidden bg-black border border-white/20 shadow-md">
      <CardContent className="p-6 md:p-8">
        <div className="relative flex flex-col items-center gap-4 md:flex-row md:gap-8">
          <div className="relative flex-shrink-0 w-28 h-28 md:w-36 md:h-36">
            <Button className="h-full w-full rounded-full border-4 border-card p-0 shadow-lg">
                <Image
                    src={figure.imageUrl}
                    alt={figure.name}
                    fill
                    className="rounded-full object-cover"
                    data-ai-hint={figure.imageHint}
                />
            </Button>
          </div>
          <div className="flex flex-col items-center md:items-start flex-1 text-center md:text-left">
            <div className="flex items-center gap-3">
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
            <div className="mt-2">
              <PersonalStreak figureId={figureId} />
            </div>
          </div>
          <div className="absolute right-0 top-0">
             <ShareButton figureId={figure.id} figureName={figure.name} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
