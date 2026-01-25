'use client';

import { useContext } from 'react';
import Image from 'next/image';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { requestNotificationPermissionAndGetToken, useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function StreakAnimationOverlay() {
  const { isVisible, streakCount, isPromptVisible, hideStreakAnimation } = useContext(StreakAnimationContext);
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

  const handleSubscribe = async () => {
    if (!firebaseApp) {
      toast({ title: "Error", description: "Firebase no está inicializado.", variant: "destructive" });
      hideStreakAnimation();
      return;
    }
    const token = await requestNotificationPermissionAndGetToken(firebaseApp);
    if (token) {
        toast({ title: "¡Suscrito a las notificaciones!", description: "Ahora recibirás notificaciones para no perder tu racha." });
    } else {
        toast({ title: "Permiso no concedido", description: "No se pudieron activar las notificaciones.", variant: "destructive" });
    }
    hideStreakAnimation();
  };

  const showStreak = isVisible && !isPromptVisible;
  const showPrompt = isVisible && isPromptVisible;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Streak Animation */}
      <div
        className={cn(
          'flex flex-col items-center transition-all duration-500 absolute',
          showStreak ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'
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
        <p className="text-2xl font-bold text-white mt-4">¡Racha de Lealtad!</p>
        <p className="text-8xl font-extrabold text-orange-500 drop-shadow-lg">
          Día {streakCount}
        </p>
      </div>

      {/* Notification Prompt */}
      <div
        className={cn(
          'flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-2xl transition-all duration-500 max-w-sm mx-4',
          showPrompt ? 'scale-100 opacity-100' : 'scale-110 opacity-0 pointer-events-none'
        )}
      >
         <div className="p-3 bg-primary/10 rounded-full mb-4">
            <Bell className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">¡No Pierdas tu Racha!</h3>
        <p className="text-muted-foreground mt-2 mb-6">Activa las notificaciones para recibir recordatorios y mantener tu racha viva.</p>
        <div className="flex w-full gap-4">
            <Button variant="outline" className="flex-1" onClick={hideStreakAnimation}>
                Ahora no
            </Button>
            <Button className="flex-1" onClick={handleSubscribe}>
                Activar
            </Button>
        </div>
      </div>
    </div>
  );
}
