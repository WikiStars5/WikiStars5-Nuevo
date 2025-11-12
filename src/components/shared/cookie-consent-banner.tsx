
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'wikistars5-cookie-consent';

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // This effect runs only on the client side
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      // Show the banner only if consent has not been given yet
      if (!consent) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
      setIsVisible(false);
    } catch (error) {
       console.error("Could not write to localStorage:", error);
       // Hide banner anyway for better user experience
       setIsVisible(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[150] p-4 transition-transform duration-500 ease-in-out',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <Card className="container mx-auto flex max-w-4xl flex-col items-center gap-4 border-primary/20 bg-card/80 p-4 shadow-2xl backdrop-blur-md md:flex-row md:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="h-6 w-6 flex-shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Utilizamos cookies para mejorar tu experiencia y para fines publicitarios. Al continuar, aceptas nuestro uso de cookies. Lee nuestra{' '}
            <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">
              Política de Privacidad
            </Link>
            .
          </p>
        </div>
        <Button onClick={handleAccept} className="w-full flex-shrink-0 md:w-auto">
          Aceptar
        </Button>
      </Card>
    </div>
  );
}
