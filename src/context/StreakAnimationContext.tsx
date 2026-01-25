'use client';

import React, { createContext, useState, useCallback, ReactNode } from 'react';

interface StreakAnimationContextType {
  isVisible: boolean;
  streakCount: number;
  isPromptVisible: boolean;
  showStreakAnimation: (count: number, options?: { showPrompt?: boolean }) => void;
  hideStreakAnimation: () => void;
}

export const StreakAnimationContext = createContext<StreakAnimationContextType>({
  isVisible: false,
  streakCount: 0,
  isPromptVisible: false,
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

  const hideStreakAnimation = useCallback(() => {
    setIsVisible(false);
    setIsPromptVisible(false);
  }, []);

  const showStreakAnimation = useCallback(
    (count: number, options?: { showPrompt?: boolean }) => {
      // Don't show the prompt if notifications are already enabled.
      const shouldShowPrompt = options?.showPrompt && Notification.permission !== 'granted';

      if (count > 0) {
        setStreakCount(count);
        setIsVisible(true);
        setIsPromptVisible(false); // Always start with the streak animation

        setTimeout(() => {
          if (shouldShowPrompt) {
            // Transition to the prompt instead of hiding
            setIsPromptVisible(true);
          } else {
            // Otherwise, just hide everything
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
    showStreakAnimation,
    hideStreakAnimation,
  };

  return (
    <StreakAnimationContext.Provider value={contextValue}>
      {children}
    </StreakAnimationContext.Provider>
  );
}
