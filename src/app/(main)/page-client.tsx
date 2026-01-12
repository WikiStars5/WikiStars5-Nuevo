'use client';

import * as React from 'react';
import type { Comment, AttitudeVote, FeaturedFigure } from '@/lib/types';
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

interface HomePageContentProps {
  initialFeaturedFigures: FeaturedFigure[];
}


const POSTS_PER_FIGURE = 5;

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function HomePageContent({ initialFeaturedFigures }: HomePageContentProps) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [feedComments, setFeedComments] = React.useState<Comment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // 1. Obtener los personajes votados
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
  
  // 2. Función para buscar en las SUBCOLECCIONES (figures/{id}/comments)
  const fetchFeed = React.useCallback(async (figureIds: string[]) => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      if (figureIds.length > 0) {
        const postPromises = figureIds.map(figureId => {
          // Usamos la ruta real de tu base de datos
          const commentsRef = collection(firestore, 'figures', figureId, 'comments');
          const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(POSTS_PER_FIGURE));
          return getDocs(q);
        });

        const snapshots = await Promise.all(postPromises);
        
        const allFetchedPosts = snapshots.flatMap(snapshot => 
          snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as unknown as Comment;
          })
        );
        
        setFeedComments(shuffleArray(allFetchedPosts));
      } else {
        setFeedComments([]);
      }
    } catch (error) {
      console.error("Error al armar el feed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore]);

  // 3. Efecto de control igual al de la otra IA
  React.useEffect(() => {
    if (!isLoadingVotes) {
      fetchFeed(votedFigureIds);
    }
  }, [votedFigureIds, isLoadingVotes, fetchFeed]);

  const renderContent = () => {
    // Aplicamos la lógica de la otra IA para el mensaje inicial
    const isReadyForFeed = !isUserLoading && !isLoadingVotes;
    
    if (!isReadyForFeed) {
       return (
        <div className="text-center py-10 text-muted-foreground">
          <p>Aún no hay actividad para mostrar.</p>
          <p>¡Vota por tus figuras favoritas para personalizar tu feed!</p>
        </div>
      );
    }

    // Si ya está listo pero está buscando los posts en las subcolecciones
    if (isLoading && votedFigureIds.length > 0) {
      return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3 animate-pulse">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ));
    }
    
    // Si hay comentarios encontrados
    if (feedComments.length > 0) {
      return feedComments.map(post => <StarPostCard key={post.id} post={post} />);
    }

    // Mensaje final si después de cargar todo no hay nada
    return (
      <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
        <p className="text-lg font-medium text-muted-foreground">Aún no hay actividad para mostrar.</p>
        <p className="text-sm text-muted-foreground">¡Vota por tus figuras favoritas para personalizar tu feed!</p>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <FeaturedFigures />
      <h2 className="text-2xl font-bold font-headline mb-6 mt-10">Mira lo que dicen en vivo sobre tus personajes favoritos</h2>
      <div className="space-y-6">
        {renderContent()}
      </div>
    </div>
  );
}
