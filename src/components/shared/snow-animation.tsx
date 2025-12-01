'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useSnow } from '@/context/SnowContext';

const SnowAnimation = () => {
  const { isSnowing } = useSnow();
  const [snowflakes, setSnowflakes] = useState<JSX.Element[]>([]);

  useEffect(() => {
    // This effect runs only on the client-side
    const generateSnowflakes = () => {
      const flakeCount = 100;
      const newSnowflakes = Array.from({ length: flakeCount }).map((_, i) => {
        const style: React.CSSProperties = {
          left: `${Math.random() * 100}vw`,
          animationDuration: `${Math.random() * 5 + 10}s`, // 10 to 15 seconds
          animationDelay: `-${Math.random() * 20}s`, // Start at random points
          opacity: Math.random() * 0.7 + 0.3,
          fontSize: `${Math.random() * 10 + 10}px`, // 10px to 20px
        };
        const character = Math.random() > 0.3 ? '❄' : '•';
        
        return <div key={i} className="snowflake" style={style}>{character}</div>;
      });
      setSnowflakes(newSnowflakes);
    };

    if (typeof window !== 'undefined') {
        generateSnowflakes();
    }
  }, []);

  if (!isSnowing) {
    return null;
  }

  return <>{snowflakes}</>;
};

export default SnowAnimation;
