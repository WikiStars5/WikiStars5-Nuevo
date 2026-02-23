'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const konamiCode = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

const idiotPhrase = 'you are an idiot';

const IdiotFace = () => (
    <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5"/>
        <circle cx="33" cy="40" r="5" fill="currentColor"/>
        <circle cx="67" cy="40" r="5" fill="currentColor"/>
        <path d="M30 65C35 75 65 75 70 65" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
    </svg>
);


export default function KonamiCodeListener() {
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [isKonamiOpen, setIsKonamiOpen] = useState(false);
  const [isIdiotOpen, setIsIdiotOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [flash, setFlash] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        setKeySequence([]);
        return;
    }
    
    const newSequence = [...keySequence, e.key];
    
    const recentKonamiKeys = newSequence.slice(-konamiCode.length);
    if (JSON.stringify(recentKonamiKeys) === JSON.stringify(konamiCode)) {
      setIsKonamiOpen(true);
      setKeySequence([]);
      return;
    }

    const sequenceString = newSequence.join('').toLowerCase();
    if (sequenceString.endsWith(idiotPhrase)) {
        setIsIdiotOpen(true);
        setKeySequence([]);
        return;
    }

    const maxRelevantLength = Math.max(konamiCode.length, idiotPhrase.length);
    if (newSequence.length > maxRelevantLength) {
      setKeySequence(newSequence.slice(-maxRelevantLength));
    } else {
      setKeySequence(newSequence);
    }
  }, [keySequence]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isIdiotOpen) {
      // 1. Force the audio to load
      audio.load(); 
      
      // 2. Attempt to play and handle browser autoplay restrictions
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Autoplay was blocked. Waiting for a user gesture.");
          
          // 3. Fallback: If autoplay fails, play on the first user click.
          const playOnGesture = () => {
            audio.play();
            document.removeEventListener('click', playOnGesture);
          };
          document.addEventListener('click', playOnGesture);
        });
      }
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isIdiotOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isIdiotOpen) {
        interval = setInterval(() => {
            setFlash(prev => !prev);
        }, 120);
    } else {
        setFlash(false);
    }

    return () => {
        if (interval) {
            clearInterval(interval);
        }
    };
  }, [isIdiotOpen]);

  return (
    <>
      {/* Audio element is now outside the dialogs to ensure it's always in the DOM */}
      <audio ref={audioRef} loop preload="auto">
        <source src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/troll%2FYou%20are%20an%20idiot__%20%5B48rz8udZBmQ%5D.mp3?alt=media&token=cc00bb22-0849-420c-b892-7a8bb722aa47" type="audio/mpeg" />
      </audio>

      <Dialog open={isKonamiOpen} onOpenChange={setIsKonamiOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="items-center">
            <Heart className="h-16 w-16 text-pink-500 animate-pulse" />
            <DialogTitle className="text-2xl font-bold">¡Felicidades!</DialogTitle>
            <DialogDescription>
              Has descubierto un mensaje oculto en el corazón de WikiStars5.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-muted-foreground italic">
            <p>"Alexandra, han pasado 10 años y aún te sigo amando. Eres la unica chica que he amado de verdad."</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isIdiotOpen} onOpenChange={setIsIdiotOpen}>
        <DialogContent 
          className={cn(
              "sm:max-w-2xl text-center border-white transition-colors duration-100",
              flash ? "bg-white text-black" : "bg-black text-white"
          )}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-4xl md:text-5xl font-serif">you are an idiot</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-8 py-4">
            <IdiotFace />
            <IdiotFace />
            <IdiotFace />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}