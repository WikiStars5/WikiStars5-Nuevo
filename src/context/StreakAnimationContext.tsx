'use client';

import React, { createContext, useState, useCallback, ReactNode } from 'react';

interface StreakAnimationContextType {
  isVisible: boolean;
  streakCount: number;
  showStreakAnimation: (count: number) => void;
}

export const StreakAnimationContext = createContext<StreakAnimationContextType>({
  isVisible: false,
  streakCount: 0,
  showStreakAnimation: () => {},
});

interface StreakAnimationProviderProps {
  children: ReactNode;
}

export function StreakAnimationProvider({ children }: StreakAnimationProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [streakCount, setStreakCount] = useState(0);

  const showStreakAnimation = useCallback((count: number) => {
    if (count > 0) {
      setStreakCount(count);
      setIsVisible(true);
      // Hide the animation after a few seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Animation will be visible for 3 seconds
    }
  }, []);

  return (
    <StreakAnimationContext.Provider value={{ isVisible, streakCount, showStreakAnimation }}>
      {children}
    </StreakAnimationContext.Provider>
  );
}
