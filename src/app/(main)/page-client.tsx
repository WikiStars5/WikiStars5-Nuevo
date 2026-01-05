
'use client';

import * as React from 'react';
import type { Comment, AttitudeVote, FeaturedFigure, Figure as FigureType } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  Timestamp,
  where
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface HomePageContentProps {
  initialFeaturedFigures: FeaturedFigure[];
}

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
    return attitudeVotes.map(vote => vote.id); // El ID del doc es el figureId
  }, [attitudeVotes]);
  
  const fetchPosts = React.useCallback(async (figureIds: string[]) => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      let queryRef;
      if (figureIds.length > 0) {
        // --- PERSONALIZED FEED ---
        const allFetchedPosts: Comment[] = [];
        const postPromises = figureIds.map(figureId => {
          const commentsRef = collection(firestore, 'starposts');
          const q = query(commentsRef, where('figureId', '==', figureId), orderBy('createdAt', 'desc'), limit(5));
          return getDocs(q);
        });

        const snapshots = await Promise.all(postPromises);
        snapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            allFetchedPosts.push({
              ...data,
              id: doc.id,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as unknown as Comment);
          });
        });
        setFeedComments(shuffleArray(allFetchedPosts));
      } else {
        // --- GLOBAL FEED (for new users or users with no votes) ---
        queryRef = query(collection(firestore, 'starposts'), orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(queryRef);
        const posts = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          } as unknown as Comment;
        });
        setFeedComments(posts);
      }
    } catch (error) {
      console.error("Error al armar el feed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore]);

  React.useEffect(() => {
    // We wait until we know if the user has votes or not
    if (!isLoadingVotes) {
      fetchPosts(votedFigureIds);
    }
  }, [votedFigureIds, isLoadingVotes, fetchPosts]);


  const renderContent = () => {
    // Show a specific message for new/unvoted users instead of a loader.
    const isReadyForFeed = !isUserLoading && !isLoadingVotes;
    
    if (!isReadyForFeed) {
       return (
        <div className="text-center py-10 text-muted-foreground">
          <p>Aún no hay actividad para mostrar.</p>
          <p>¡Vota por tus figuras favoritas para personalizar tu feed!</p>
        </div>
      );
    }

    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3 animate-pulse">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ));
    }
    
    if (feedComments.length > 0) {
      return feedComments.map(post => <StarPostCard key={post.id} post={post} />);
    }

    return (
      <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
        <p className="text-lg font-medium">¡Tu feed está vacío!</p>
        <p className="text-sm text-muted-foreground">Vota por personajes para ver sus comentarios aquí.</p>
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

