'use client';

import { useContext } from 'react';
import Image from 'next/image';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Bell, Star, Heart } from 'lucide-react';
import { requestNotificationPermissionAndGetToken, useFirebaseApp, useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { saveFcmToken } from '@/firebase/notifications';

const btsMemberIds = ["rm", "kim-seok-jin", "suga-agust-d", "j-hope", "jimin", "v-cantante", "jungkook"];

export default function StreakAnimationOverlay() {
  const { isVisible, streakCount, isPromptVisible, hideStreakAnimation, figureId, figureName } = useContext(StreakAnimationContext);
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSubscribe = async () => {
    if (!firebaseApp || !firestore || !user) {
      toast({ title: "Error", description: "Firebase no está inicializado.", variant: "destructive" });
      hideStreakAnimation();
      return;
    }
    const token = await requestNotificationPermissionAndGetToken(firebaseApp);
    if (token) {
        // Save the token and update stats
        await saveFcmToken(firestore, user.uid, token);
        toast({ title: "¡Suscrito!", description: "Ahora recibirás notificaciones importantes." });
    } else {
        toast({ title: "Permiso no concedido", description: "No se pudieron activar las notificaciones.", variant: "destructive" });
    }
    hideStreakAnimation();
  };

  const isBtsMember = figureId && btsMemberIds.includes(figureId.toLowerCase());

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
      {showPrompt && (
        <div
          className={cn(
            'flex flex-col items-center text-center p-8 bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 max-w-sm mx-4 animate-in zoom-in duration-300',
            isBtsMember ? "border-t-4 border-t-purple-500" : ""
          )}
        >
          {isBtsMember ? (
            /* BTS / ARMY Style Prompt */
            <>
              <div className="relative mb-6">
                <div className="bg-purple-600 p-6 rounded-full relative">
                  <Bell className="h-12 w-12 text-white fill-white/20" />
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 p-1.5 rounded-full border-4 border-zinc-900">
                    <Star className="h-4 w-4 text-black fill-black" />
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-black text-white italic tracking-tight mb-4">
                ¡Haz que <span className="underline decoration-yellow-400 underline-offset-4">TU</span> racha brille! ✨
              </h3>

              <div className="space-y-4 mb-8">
                <p className="text-zinc-300 text-lg leading-snug">
                  Activa las alertas para que no se pierda la <span className="font-bold text-purple-400">LEALTAD</span> a tu <span className="font-bold italic underline decoration-purple-400 underline-offset-2">BIAS</span>.
                </p>
                <p className="text-white font-medium">
                  ¡Sé la primera en apoyar a tu Bias! 💜
                </p>
              </div>

              <Button 
                onClick={handleSubscribe}
                className="w-full h-16 text-lg font-black bg-yellow-400 hover:bg-yellow-500 text-black rounded-2xl shadow-[0_4px_0_rgb(161,130,0)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <Heart className="h-6 w-6 fill-black" />
                ¡ACTIVAR PARA ARMY!
              </Button>

              <button 
                onClick={hideStreakAnimation}
                className="mt-6 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors"
              >
                QUIZÁS EN EL PRÓXIMO COMEBACK
              </button>
            </>
          ) : (
            /* Generic Prompt */
            <>
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white">¡No Pierdas tu Racha!</h3>
              <p className="text-zinc-400 mt-2 mb-6">Activa las notificaciones para recibir recordatorios y mantener tu racha viva en el perfil de {figureName}.</p>
              <div className="flex w-full gap-4">
                <Button variant="outline" className="flex-1 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={hideStreakAnimation}>
                  Ahora no
                </Button>
                <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSubscribe}>
                  Activar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
