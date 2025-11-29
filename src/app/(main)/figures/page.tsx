
'use client';

import { useState } from 'react';
import { collection, query, orderBy, limit, startAfter, endBefore, getDocs, DocumentSnapshot } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import FigureCard from '@/components/shared/figure-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Figure } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

export default function ExplorePage() {
  const firestore = useFirestore();
  const [page, setPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [firstVisible, setFirstVisible] = useState<DocumentSnapshot | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | 'none'>('none');
  const [pageSnapshots, setPageSnapshots] = useState<Record<number, DocumentSnapshot>>({});

  const figuresCollection = useMemoFirebase(() => {
    if (!firestore) return null;

    let q = query(
      collection(firestore, 'figures'),
      orderBy('name', 'asc'),
      limit(ITEMS_PER_PAGE)
    );

    if (page > 1 && direction === 'next' && lastVisible) {
      q = query(q, startAfter(lastVisible));
    }
    
    // Note: Firestore doesn't directly support `endBefore` with `limit` for previous page logic well.
    // A more robust implementation might require fetching IDs and then documents, or keeping track of cursors.
    // For simplicity, we'll keep a basic forward navigation. The "previous" logic will be handled manually.
    
    return q;
  }, [firestore, page, lastVisible, direction]);


  const { data: figures, isLoading, error } = useCollection<Figure>(figuresCollection, {
    onNewData: (snapshot) => {
        if (snapshot && !snapshot.empty) {
            setFirstVisible(snapshot.docs[0]);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        }
        setIsFetching(false);
    }
  });
  
  const handleNextPage = () => {
    if (!lastVisible) return;
    setDirection('next');
    setPageSnapshots(prev => ({...prev, [page + 1]: lastVisible}));
    setPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (page <= 1) return;
    setDirection('prev');
    const prevPageCursor = pageSnapshots[page - 1];
    // This is a simplified approach. Firestore cursors work best with startAfter.
    // Going "back" often requires re-querying from a known point.
    // For this implementation, we will reset to page 1 if we go back.
    // A full implementation would need a more complex state management of cursors.
    setPage(1); 
    setLastVisible(null);
    setPageSnapshots({});
    
  };
  
  const hasMore = figures && figures.length === ITEMS_PER_PAGE;
  const isFirstPage = page === 1;

  const displayIsLoading = isLoading || isFetching;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Explorar Perfiles</h1>
        <p className="text-muted-foreground mt-2">Navega a través de la colección de figuras públicas.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
        {displayIsLoading && Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <div key={i} className="space-y-4">
                <Skeleton className="h-[350px] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        ))}
        {!displayIsLoading && figures?.map((figure) => (
          <FigureCard key={figure.id} figure={figure} />
        ))}
      </div>

       {!displayIsLoading && (!figures || figures.length === 0) && (
        <div className="text-center col-span-full py-16">
          <p className="text-muted-foreground">Tu base de datos está lista. ¡Añade algunos datos para verlos aquí!</p>
        </div>
      )}

      {error && (
         <div className="text-center col-span-full py-16 text-destructive">
            <p>Error al cargar los perfiles: {error.message}</p>
        </div>
      )}

      <div className="mt-12 flex justify-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handlePrevPage} disabled={isFirstPage || displayIsLoading}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm font-medium">Página {page}</span>
          <Button variant="outline" onClick={handleNextPage} disabled={!hasMore || displayIsLoading}>
             {displayIsLoading && direction === 'next' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             ) : (
                <ChevronRight className="ml-2 h-4 w-4" />
             )}
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
