
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import FigureCard from '@/components/shared/figure-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Figure } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query as firestoreQuery, where, getDocs, limit } from 'firebase/firestore';
import { normalizeText } from '@/lib/keywords';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function SearchResultsClient({ query }: { query: string }) {
  const firestore = useFirestore();
  const [figures, setFigures] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');

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

        const figuresRef = collection(firestore, 'figures');
        const q = firestoreQuery(
            figuresRef,
            where('nameKeywords', 'array-contains', normalizedSearchTerm),
            limit(20)
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-4xl font-bold tracking-tight font-headline">
                    Resultados de búsqueda para <span className="text-primary">"{query}"</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                    {isLoading ? 'Buscando...' : `Se encontraron ${figures.length} perfiles.`}
                </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted p-1">
                <Button 
                    variant={view === 'grid' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setView('grid')}
                    className={cn("h-8 px-3", view === 'grid' ? "bg-background shadow-sm" : "")}
                >
                    <LayoutGrid className="h-4 w-4 mr-2" /> Cuadrícula
                </Button>
                <Button 
                    variant={view === 'list' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setView('list')}
                    className={cn("h-8 px-3", view === 'list' ? "bg-background shadow-sm" : "")}
                >
                    <List className="h-4 w-4 mr-2" /> Lista
                </Button>
            </div>
        </div>
      </header>

      {view === 'grid' ? (
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
        ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perfil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                </TableRow>
              ))}
              {figures.map((figure) => (
                <TableRow key={figure.id}>
                  <TableCell>
                     <Link href={`/figures/${figure.id}`} className="flex items-center gap-4 group">
                        <Avatar className="h-12 w-12">
                           <AvatarImage src={figure.imageUrl} alt={figure.name} className="object-cover" />
                           <AvatarFallback>{figure.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium group-hover:underline">{figure.name}</span>
                     </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
