
'use client';

import { useEffect, useState } from 'react';
import FigureCard from '@/components/shared/figure-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Figure } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


export default function HashtagPage({ params }: { params: { tag: string } }) {
  const firestore = useFirestore();
  const [figures, setFigures] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const tag = decodeURIComponent(params.tag);

  useEffect(() => {
    const fetchFigures = async () => {
      if (!firestore) return;
      try {
        setIsLoading(true);
        const figuresCollection = collection(firestore, 'figures');
        const firestoreQuery = query(
          figuresCollection,
          where('tags', 'array-contains', tag),
          where('approved', '==', true)
        );
        const snapshot = await getDocs(firestoreQuery);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Figure));
        setFigures(results);
      } catch (err) {
        setError('Failed to load figures for this hashtag.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (firestore) {
      fetchFigures();
    }
  }, [tag, firestore]);

  if (error) {
    // This could be a more user-friendly error component
    return <div className="container mx-auto px-4 py-8 md:py-12 text-center text-red-500">{error}</div>;
  }

  if (!isLoading && figures.length === 0) {
     return (
        <div className="container mx-auto px-4 py-8 md:py-12 text-center">
            <h1 className="text-4xl font-bold tracking-tight font-headline">
                Resultados para <span className="text-primary">#{tag}</span>
            </h1>
            <p className="text-muted-foreground mt-4">No se encontraron perfiles con esta etiqueta.</p>
        </div>
     )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight font-headline">
            Resultados para <span className="text-primary">#{tag}</span>
        </h1>
        <p className="text-muted-foreground mt-2">
            Mostrando perfiles etiquetados con #{tag}.
        </p>
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
    </div>
  );
}
