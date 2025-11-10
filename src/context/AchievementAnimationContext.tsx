
'use client';

import React, { createContext, useState, useCallback, ReactNode } from 'react';

interface AchievementDetails {
  name: string;
  imageUrl: string;
  soundUrl: string;
}

interface AchievementAnimationContextType {
  isVisible: boolean;
  achievementDetails: AchievementDetails | null;
  showAchievementAnimation: (details: AchievementDetails) => void;
}

export const AchievementAnimationContext = createContext<AchievementAnimationContextType>({
  isVisible: false,
  achievementDetails: null,
  showAchievementAnimation: () => {},
});

interface AchievementAnimationProviderProps {
  children: ReactNode;
}

export function AchievementAnimationProvider({ children }: AchievementAnimationProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [achievementDetails, setAchievementDetails] = useState<AchievementDetails | null>(null);

  const showAchievementAnimation = useCallback((details: AchievementDetails) => {
    setAchievementDetails(details);
    setIsVisible(true);
    
    const audio = new Audio(details.soundUrl);
    audio.play().catch(e => console.error("Error playing achievement sound:", e));

    setTimeout(() => {
      setIsVisible(false);
    }, 5000); // Animation visible for 5 seconds
  }, []);

  return (
    <AchievementAnimationContext.Provider value={{ isVisible, achievementDetails, showAchievementAnimation }}>
      {children}
    </AchievementAnimationContext.Provider>
  );
}
