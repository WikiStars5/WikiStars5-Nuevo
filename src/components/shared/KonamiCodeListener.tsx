'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

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
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore keys with modifiers to avoid conflicts with browser shortcuts
    if (e.metaKey || e.ctrlKey || e.altKey) {
        setKeySequence([]); // Reset on modifier key press
        return;
    }
    
    // Use a temporary sequence to avoid state update delays
    const newSequence = [...keySequence, e.key];
    
    // --- Check for Konami Code ---
    // Get the last 10 keys
    const recentKonamiKeys = newSequence.slice(-konamiCode.length);
    if (JSON.stringify(recentKonamiKeys) === JSON.stringify(konamiCode)) {
      setIsKonamiOpen(true);
      setKeySequence([]); // Reset after successful entry
      return; // Stop processing to avoid conflicts
    }

    // --- Check for "you are an idiot" ---
    const sequenceString = newSequence.join('').toLowerCase();
    if (sequenceString.endsWith(idiotPhrase)) {
        setIsIdiotOpen(true);
        setKeySequence([]); // Reset
        return; // Stop processing
    }

    // Keep the sequence from growing indefinitely
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
  
  // Effect to handle audio playback for the idiot dialog
  useEffect(() => {
    if (isIdiotOpen && audioRef.current) {
      // Browsers require user interaction to play audio. 
      // The dialog opening is that interaction. We try to play it.
      audioRef.current.play().catch(e => {
        // If it fails, we know we need another click.
        // For simplicity, we'll let the user close and reopen.
        console.warn("Audio playback failed initially. A user click might be needed.", e);
      });
    } else if (!isIdiotOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Reset audio
    }
  }, [isIdiotOpen]);

  return (
    <>
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
        <DialogContent className="sm:max-w-2xl text-center bg-black text-white border-white">
          <DialogHeader>
            <DialogTitle className="text-4xl md:text-5xl font-serif">you are an idiot</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-8 py-4">
            <IdiotFace />
            <IdiotFace />
            <IdiotFace />
          </div>
          <audio ref={audioRef} loop>
            <source src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/troll%2FYou%20are%20an%20idiot__%20%5B48rz8udZBmQ%5D.mp3?alt=media&token=cc00bb22-0849-420c-b892-7a8bb722aa47" type="audio/mpeg" />
          </audio>
        </DialogContent>
      </Dialog>
    </>
  );
}
