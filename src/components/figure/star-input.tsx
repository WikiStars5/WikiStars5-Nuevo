'use client';

import * as React from 'react';
import { Star, StarOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarInputProps {
  value: number | null;
  onChange: (value: number) => void;
  maxStars?: number;
}

export default function StarInput({
  value,
  onChange,
  maxStars = 5,
}: StarInputProps) {
  const [hoverValue, setHoverValue] = React.useState<number | undefined>(undefined);

  const stars = React.useMemo(() => {
    return Array(maxStars + 1).fill(0).map((_, i) => i);
  }, [maxStars]);

  return (
    <div className="flex items-center gap-1">
      {stars.map((starValue) => {
        const isSelected = starValue === value;
        const isHovered = hoverValue !== undefined && starValue <= hoverValue;
        const isCurrentValueSelected = value !== null && starValue <= value;

        const isZeroStar = starValue === 0;

        if (isZeroStar) {
          return (
             <button
                key={starValue}
                type="button"
                onClick={() => onChange(0)}
                onMouseEnter={() => setHoverValue(0)}
                onMouseLeave={() => setHoverValue(undefined)}
                className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border-2 px-3 py-1.5 text-sm font-medium transition-colors",
                    (isSelected || hoverValue === 0) ? "border-primary bg-primary/10 text-primary" : "border-dashed hover:border-muted-foreground"
                )}
             >
                <StarOff className="h-4 w-4" /> 0
             </button>
          )
        }

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHoverValue(starValue)}
            onMouseLeave={() => setHoverValue(undefined)}
            className="group"
          >
            <Star
              className={cn(
                'h-7 w-7 cursor-pointer text-muted-foreground transition-colors',
                (isHovered || isCurrentValueSelected) && 'text-yellow-400',
                isHovered && 'scale-110 transform'
              )}
              fill={(isHovered || isCurrentValueSelected) ? 'currentColor' : 'none'}
            />
          </button>
        );
      })}
    </div>
  );
}
