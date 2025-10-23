'use client';

import { useContext } from 'react';
import Image from 'next/image';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { cn } from '@/lib/utils';

export default function StreakAnimationOverlay() {
  const { isVisible, streakCount } = useContext(StreakAnimationContext);

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
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/racha%2Ffire.gif?alt=media&token=c6eefbb1-b51c-48a4-ae20-7ca8bef2cf63"
          alt="Animación de racha"
          width={256}
          height={256}
          unoptimized
          className="h-64 w-64"
        />
        <p className="text-2xl font-bold text-white mt-4">¡Racha de Días!</p>
        <p className="text-8xl font-extrabold text-orange-500 drop-shadow-lg">
          Día {streakCount}
        </p>
      </div>
    </div>
  );
}
