
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface SnowContextType {
  isSnowing: boolean;
  toggleSnow: () => void;
}

const SnowContext = createContext<SnowContextType | undefined>(undefined);

const SNOW_PREFERENCE_KEY = 'wikistars5-snow-preference';

export const SnowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSnowing, setIsSnowing] = useState(false); // Default to off

  useEffect(() => {
    // This effect runs only on the client side
    try {
      const savedPreference = localStorage.getItem(SNOW_PREFERENCE_KEY);
      // Set state based on saved preference, otherwise it remains false
      if (savedPreference === 'true') {
        setIsSnowing(true);
      }
    } catch (error) {
      console.error("Could not access localStorage for snow preference:", error);
    }
  }, []);

  const toggleSnow = () => {
    const newIsSnowing = !isSnowing;
    setIsSnowing(newIsSnowing);
    try {
      localStorage.setItem(SNOW_PREFERENCE_KEY, String(newIsSnowing));
    } catch (error) {
        console.error("Could not save snow preference to localStorage:", error)
    }
  };

  return (
    <SnowContext.Provider value={{ isSnowing, toggleSnow }}>
      {children}
    </SnowContext.Provider>
  );
};

export const useSnow = () => {
  const context = useContext(SnowContext);
  if (context === undefined) {
    throw new Error('useSnow must be used within a SnowProvider');
  }
  return context;
};
