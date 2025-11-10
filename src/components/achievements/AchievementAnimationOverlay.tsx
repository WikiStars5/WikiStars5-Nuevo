
'use client';

import { useContext } from 'react';
import Image from 'next/image';
import { AchievementAnimationContext } from '@/context/AchievementAnimationContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '../ui/card';

export default function AchievementAnimationOverlay() {
  const { isVisible, achievementDetails } = useContext(AchievementAnimationContext);

  if (!achievementDetails) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center transition-all duration-500',
          isVisible ? 'scale-100 opacity-100' : 'scale-125 opacity-0'
        )}
      >
        <p className="text-2xl font-bold text-white mb-4">¡Logro Desbloqueado!</p>
        <Card className="w-64 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-2 border-yellow-500 shadow-2xl shadow-yellow-500/30">
            <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
                 <Image
                    src={achievementDetails.imageUrl}
                    alt={achievementDetails.name}
                    width={128}
                    height={128}
                    unoptimized
                    className="h-32 w-32"
                />
                <p className="text-xl font-extrabold text-white drop-shadow-lg text-center">
                    {achievementDetails.name}
                </p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
