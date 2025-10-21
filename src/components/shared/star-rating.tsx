import { Star, StarOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  rating: number;
  totalStars?: number;
  className?: string;
  starClassName?: string;
};

export function StarRating({ rating, totalStars = 5, className, starClassName }: StarRatingProps) {
  if (rating === 0) {
    return (
      <div className={cn('flex items-center gap-0.5', className)}>
        <StarOff className={cn('text-destructive', starClassName)} />
      </div>
    );
  }
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[...Array(totalStars)].map((_, i) => {
        const starNumber = i + 1;
        const isFilled = starNumber <= fullStars;
        const isHalf = hasHalfStar && starNumber === fullStars + 1;
        return (
          <div key={i} className="relative">
            <Star
              className={cn('text-muted-foreground/50', starClassName)}
              fill="currentColor"
            />
            {(isFilled || isHalf) && (
              <Star
                className={cn('absolute top-0 left-0 text-yellow-400', starClassName)}
                fill="currentColor"
                style={{
                  clipPath: isHalf ? 'inset(0 50% 0 0)' : 'inset(0 0 0 0)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
