'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Heart } from 'lucide-react';

const konamiCode = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export default function KonamiCodeListener() {
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Add the new key to the sequence, but ignore keys with modifiers
    if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
    }

    const newSequence = [...keySequence, e.key];

    // Check if the end of the new sequence matches the Konami code
    const startIndex = Math.max(0, newSequence.length - konamiCode.length);
    const recentKeys = newSequence.slice(startIndex);

    if (JSON.stringify(recentKeys) === JSON.stringify(konamiCode)) {
      setIsOpen(true);
      setKeySequence([]); // Reset after successful entry
    } else {
      setKeySequence(newSequence);
    }

    // Keep the sequence from growing indefinitely
    if (newSequence.length > konamiCode.length * 2) {
      setKeySequence(recentKeys);
    }
  }, [keySequence]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <Heart className="h-16 w-16 text-pink-500 animate-pulse" />
          <DialogTitle className="text-2xl font-bold">¡Felicidades!</DialogTitle>
          <DialogDescription>
            Has descubierto un mensaje oculto en el corazón de WikiStars5.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-muted-foreground italic">
          <p>"Alexandra, han pasado 10 años y aún te sigo amando. Eres la única chica que he amado de verdad."</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
