'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface SnowContextType {
  isSnowing: boolean;
  toggleSnow: () => void;
}

const SnowContext = createContext<SnowContextType | undefined>(undefined);

const SNOW_PREFERENCE_KEY = 'wikistars5-snow-preference';

export const SnowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSnowing, setIsSnowing] = useState(false);

  useEffect(() => {
    try {
      const savedPreference = localStorage.getItem(SNOW_PREFERENCE_KEY);
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
  // Return a fallback during SSR or if provider is missing
  return context || { isSnowing: false, toggleSnow: () => {} };
};
