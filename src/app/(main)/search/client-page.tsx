
'use client';

import { useEffect, useState } from 'react';
import FigureCard from '@/components/shared/figure-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Figure } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query as firestoreQuery, where, getDocs, limit } from 'firebase/firestore';
import { normalizeText } from '@/lib/keywords';

export default function SearchResultsClient({ query }: { query: string }) {
  const firestore = useFirestore();
  const [figures, setFigures] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFigures = async () => {
      if (!firestore || !query) {
        setFigures([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const normalizedSearchTerm = normalizeText(query);

        // This query will search across the nameKeywords array for any document
        // where our normalized search term is one of the prefixes.
        const figuresRef = collection(firestore, 'figures');
        const q = firestoreQuery(
            figuresRef,
            where('nameKeywords', 'array-contains', normalizedSearchTerm),
            limit(50) // Limit the results for performance
        );
        
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Figure));
        setFigures(results);
      } catch (err) {
        setError('Falló la carga de los resultados de la búsqueda.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (firestore) {
      fetchFigures();
    }
  }, [query, firestore]);

  if (error) {
    return <div className="container mx-auto px-4 py-8 md:py-12 text-center text-red-500">{error}</div>;
  }

  if (!isLoading && figures.length === 0) {
     return (
        <div className="container mx-auto px-4 py-8 md:py-12 text-center">
            <h1 className="text-4xl font-bold tracking-tight font-headline">
                Sin resultados para <span className="text-primary">"{query}"</span>
            </h1>
            <p className="text-muted-foreground mt-4">No se encontraron perfiles que coincidan con tu búsqueda.</p>
        </div>
     )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight font-headline">
            Resultados de búsqueda para <span className="text-primary">"{query}"</span>
        </h1>
        <p className="text-muted-foreground mt-2">
            {isLoading ? 'Buscando...' : `Se encontraron ${figures.length} perfiles.`}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
        {isLoading && Array.from({ length: 10 }).map((_, i) => (
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

    