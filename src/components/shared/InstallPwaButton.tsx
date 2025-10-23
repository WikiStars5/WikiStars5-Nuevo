
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

// This is the type definition for the BeforeInstallPromptEvent.
// It's not a standard built-in type, so we define it manually.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the browser from showing its default install banner
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    // Show the browser's install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    await deferredPrompt.userChoice;
    // We've used the prompt, and it can't be used again. Clear it.
    setDeferredPrompt(null);
  };

  const isInstallable = !!deferredPrompt;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* We wrap the button in a div because TooltipTrigger requires a single child
              that can accept a ref, and disabled buttons sometimes don't. */}
          <div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleInstallClick}
              disabled={!isInstallable}
              aria-label="Instalar aplicación"
              className={cn(
                isInstallable && "animate-pulse"
              )}
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isInstallable ? 'Instalar aplicación' : 'Instalación no disponible'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
