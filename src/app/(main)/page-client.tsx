'use client';

import * as React from 'react';
import type { Comment, AttitudeVote, Figure as FeaturedFigure } from '@/lib/types';
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

const POSTS_PER_FIGURE = 5;

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

interface HomePageContentProps {
  initialFeaturedFigures: FeaturedFigure[];
}


export default function HomePageContent({ initialFeaturedFigures }: HomePageContentProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [feedComments, setFeedComments] = React.useState<Comment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // 1. Obtener los personajes votados (ej: adam-driver, adolf-hitler)
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
  
  const fetchPosts = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      let allFetchedPosts: Comment[] = [];

      if (votedFigureIds && votedFigureIds.length > 0) {
        // PERSONALIZED FEED: Fetch posts for each voted figure
        const postPromises = votedFigureIds.map(figureId => {
          const commentsRef = collection(firestore, 'starposts');
          const q = query(
            commentsRef, 
            where('figureId', '==', figureId),
            orderBy('createdAt', 'desc'), 
            limit(POSTS_PER_FIGURE)
          );
          return getDocs(q);
        });

        const snapshots = await Promise.all(postPromises);
        
        allFetchedPosts = snapshots.flatMap(snapshot => 
          snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as unknown as Comment;
          })
        );
      } else if (user && !isLoadingVotes) {
        // GLOBAL FEED for logged-in users with no votes
        const globalQuery = query(collection(firestore, 'starposts'), orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(globalQuery);
        allFetchedPosts = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          } as unknown as Comment;
        });
      }
      
      setFeedComments(shuffleArray(allFetchedPosts));

    } catch (error) {
      console.error("Error fetching feed:", error);
      setFeedComments([]); // Clear on error
    } finally {
      setIsLoading(false);
    }
  }, [firestore, votedFigureIds, user, isLoadingVotes]);

  React.useEffect(() => {
    // We wait until the votes have been loaded to decide what to fetch.
    if (!isLoadingVotes) {
      fetchPosts();
    }
  }, [votedFigureIds, isLoadingVotes, fetchPosts]);

  const renderContent = () => {
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

    // This message is for users who have not voted for anyone yet.
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>¡Vota por tus figuras favoritas para personalizar tu feed!</p>
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