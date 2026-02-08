'use client';

import * as React from 'react';
import type { Comment, AttitudeVote } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

// CONFIGURACIÓN DE RENTABILIDAD
const MAX_FIGURES_TO_CONSULT = 5; // Cada clic consulta 5 figuras al azar
const POSTS_PER_FIGURE = 1;       // Trae solo el post más reciente de cada una

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function HomePageContent({ initialFeaturedFigures }: any) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [feedComments, setFeedComments] = React.useState<Comment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAppending, setIsAppending] = React.useState(false); // Estado para el botón de "Ver más"

  // 1. Obtener IDs de figuras votadas por el usuario
  const attitudeVotesQuery = useMemoFirebase(() => {
    if (!user || !firestore || user.isAnonymous) return null;
    return collection(firestore, 'users', user.uid, 'attitudeVotes');
  }, [user, firestore]);

  const { data: attitudeVotes, isLoading: isLoadingVotes } = useCollection<AttitudeVote>(
    attitudeVotesQuery, 
    { enabled: !!user && !user.isAnonymous }
  );

  const votedFigureIds = React.useMemo(() => {
    if (!attitudeVotes) return [];
    return attitudeVotes.map(vote => vote.id); 
  }, [attitudeVotes]);
  
  // 2. Función de carga: Puede REEMPLAZAR o ACUMULAR (append)
  const fetchFeed = React.useCallback(async (figureIds: string[], append = false) => {
    if (!firestore || figureIds.length === 0) {
      if (!append) setFeedComments([]);
      setIsLoading(false);
      return;
    }

    if (append) setIsAppending(true);
    else setIsLoading(true);

    try {
      // Tómbola: Elegimos 5 figuras al azar de su lista de favoritos
      const randomFigures = shuffleArray(figureIds).slice(0, MAX_FIGURES_TO_CONSULT);

      const postPromises = randomFigures.map(figureId => {
        const commentsRef = collection(firestore, 'figures', figureId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(POSTS_PER_FIGURE));
        return getDocs(q);
      });

      const snapshots = await Promise.all(postPromises);
      
      const newPosts = snapshots.flatMap(snapshot => 
        snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt,
          } as unknown as Comment;
        })
      );
      
      const shuffledNewPosts = shuffleArray(newPosts);

      if (append) {
        // SUMAMOS a lo que ya existe (5 + 5 + 5...)
        setFeedComments(prev => [...prev, ...shuffledNewPosts]);
      } else {
        // Carga inicial
        setFeedComments(shuffledNewPosts);
      }
    } catch (error) {
      console.error("Error al armar el feed:", error);
    } finally {
      setIsLoading(false);
      setIsAppending(false);
    }
  }, [firestore]);

  // 3. Efecto de carga inicial
  React.useEffect(() => {
    if (!isLoadingVotes && votedFigureIds.length > 0) {
      fetchFeed(votedFigureIds);
    } else if (!isLoadingVotes && votedFigureIds.length === 0) {
      setIsLoading(false);
    }
  }, [votedFigureIds, isLoadingVotes, fetchFeed]);

  const renderContent = () => {
    const isReadyForFeed = !isUserLoading && !isLoadingVotes;
    
    // Skeleton solo para la carga inicial de la página
    if (isLoading && feedComments.length === 0) {
      return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3 animate-pulse mb-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      ));
    }

    if (!isReadyForFeed || (votedFigureIds.length === 0 && !isLoading)) {
       return (
        <div className="text-center py-20 bg-slate-50 dark:bg-card/50 rounded-2xl border-2 border-dashed">
          <p className="text-lg font-medium text-muted-foreground">Tu feed está vacío</p>
          <p className="text-sm text-muted-foreground mb-6">¡Vota por tus figuras favoritas para ver sus StarPosts!</p>
        </div>
      );
    }
    
    if (feedComments.length > 0) {
      return (
        <>
            {/* El feed que va creciendo */}
            <div className="space-y-6">
                {feedComments.map((post, index) => (
                    <StarPostCard key={`${post.id}-${index}`} post={post} />
                ))}
            </div>
            
            {/* BOTÓN DE CRECIMIENTO: Agrega 5 más al azar */}
            <div className="mt-8 flex flex-col items-center">
                <Button 
                    variant="outline" 
                    className="w-full py-6 flex gap-2 text-lg font-medium border-primary/20 hover:bg-primary/5"
                    onClick={() => fetchFeed(votedFigureIds, true)} 
                    disabled={isAppending}
                >
                    <RefreshCw className={`h-5 w-5 ${isAppending ? 'animate-spin' : ''}`} />
                    {isAppending ? 'Buscando más contenido...' : 'Ver más StarPosts'}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-widest">
                  Mezclando tus favoritos al azar
                </p>
            </div>
        </>
      );
    }

    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No encontramos posts de tus figuras favoritas.</p>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <FeaturedFigures />
      <h2 className="text-2xl font-bold font-headline mb-6 mt-10">
        Para ti: Lo más reciente
      </h2>
      {renderContent()}
    </div>
  );
}