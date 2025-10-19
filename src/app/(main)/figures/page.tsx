'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import FigureCard from '@/components/shared/figure-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExplorePage() {
  const firestore = useFirestore();
  const figuresCollection = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'figures'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: figures, isLoading } = useCollection<any>(figuresCollection);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Explore Figures</h1>
        <p className="text-muted-foreground mt-2">Browse through the entire collection of public figures.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
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

       {figures && figures.length === 0 && !isLoading && (
        <div className="text-center col-span-full py-16">
          <p className="text-muted-foreground">Your database is ready. Add some data to see it here!</p>
        </div>
      )}

      <div className="mt-12 flex justify-center">
        <div className="flex items-center gap-4">
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm font-medium">Page 1 of 1</span>
          <Button variant="outline">
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

    