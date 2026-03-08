'use client';

import React, { createContext, useState, useCallback, ReactNode } from 'react';

interface StreakAnimationContextType {
  isVisible: boolean;
  streakCount: number;
  isPromptVisible: boolean;
  figureName: string;
  figureId: string;
  showStreakAnimation: (count: number, options?: { showPrompt?: boolean, figureName?: string, figureId?: string }) => void;
  hideStreakAnimation: () => void;
}

export const StreakAnimationContext = createContext<StreakAnimationContextType>({
  isVisible: false,
  streakCount: 0,
  isPromptVisible: false,
  figureName: '',
  figureId: '',
  showStreakAnimation: () => {},
  hideStreakAnimation: () => {},
});

interface StreakAnimationProviderProps {
  children: ReactNode;
}

export function StreakAnimationProvider({ children }: StreakAnimationProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [figureName, setFigureName] = useState('');
  const [figureId, setFigureId] = useState('');

  const hideStreakAnimation = useCallback(() => {
    setIsVisible(false);
    setIsPromptVisible(false);
  }, []);

  const showStreakAnimation = useCallback(
    (count: number, options?: { showPrompt?: boolean, figureName?: string, figureId?: string }) => {
      // Don't show the prompt if notifications are already enabled.
      const shouldShowPrompt = options?.showPrompt && typeof Notification !== 'undefined' && Notification.permission !== 'granted';

      if (count > 0) {
        setStreakCount(count);
        setFigureName(options?.figureName || '');
        setFigureId(options?.figureId || '');
        setIsVisible(true);
        setIsPromptVisible(false); // Always start with the streak animation

        setTimeout(() => {
          if (shouldShowPrompt) {
            setIsPromptVisible(true);
          } else {
            hideStreakAnimation();
          }
        }, 3000); // Duration of the streak animation
      }
    },
    [hideStreakAnimation]
  );

  const contextValue = {
    isVisible,
    streakCount,
    isPromptVisible,
    figureName,
    figureId,
    showStreakAnimation,
    hideStreakAnimation,
  };

  return (
    <StreakAnimationContext.Provider value={contextValue}>
      {children}
    </StreakAnimationContext.Provider>
  );
}
