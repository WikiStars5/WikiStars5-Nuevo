'use client';

import { useMemo } from 'react';
import { collection, query, where, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import FigureCard from '@/components/shared/figure-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Figure } from '@/lib/types';
import { Star } from 'lucide-react';

export default function FeaturedFigures() {
  const firestore = useFirestore();
  
  const featuredFiguresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'figures'), 
      where('isFeatured', '==', true),
      where('approved', '==', true),
      limit(6)
    );
  }, [firestore]);

  const { data: figures, isLoading } = useCollection<Figure>(featuredFiguresQuery);

  if (!isLoading && (!figures || figures.length === 0)) {
    return null; // Don't render the section if there are no featured figures
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-8">
        <Star className="h-8 w-8 text-yellow-400" fill="currentColor" />
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Figuras Destacadas
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 md:gap-8">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-4">
                <Skeleton className="h-[350px] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        ))}
        {figures?.map((figure) => (
          <FigureCard key={figure.id} figure={figure} />
        ))}
      </div>
    </section>
  );
}
