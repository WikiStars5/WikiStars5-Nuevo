
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
          animationDuration: `${Math.random() * 5 + 5}s`, // 5 to 10 seconds
          animationDelay: `${Math.random() * 5}s`,
          opacity: Math.random(),
          transform: `scale(${Math.random()})`,
        };
        return <div key={i} className="snowflake" style={style} />;
      });
      setSnowflakes(newSnowflakes);
    };

    generateSnowflakes();
  }, []);

  if (!isSnowing) {
    return null;
  }

  return <>{snowflakes}</>;
};

export default SnowAnimation;
