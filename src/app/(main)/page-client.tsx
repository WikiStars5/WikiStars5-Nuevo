
'use client';

import * as React from 'react';
import type { Comment, FeaturedFigure, AttitudeVote } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, Timestamp, QueryDocumentSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const POST_LIMIT = 10;

interface HomePageContentProps {
  initialFeaturedFigures: FeaturedFigure[];
}

export default function HomePageContent({ 
  initialFeaturedFigures, 
}: HomePageContentProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const [feedComments, setFeedComments] = React.useState<Comment[]>([]);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  // Use useCollection to reactively get the user's voted figures
  const attitudeVotesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'attitudeVotes');
  }, [user, firestore]);

  const { data: attitudeVotes, isLoading: isLoadingVotes } = useCollection<AttitudeVote>(attitudeVotesQuery, { enabled: !!user });

  // Memoize the derived list of figure IDs
  const votedFigureIds = React.useMemo(() => {
    if (!attitudeVotes) return null;
    // The figureId is the document ID in this collection
    return attitudeVotes.map(vote => vote.id);
  }, [attitudeVotes]);
  
  const fetchPosts = React.useCallback(async (lastDoc: QueryDocumentSnapshot | null = null) => {
    if (!firestore || votedFigureIds === null) return;

    if (lastDoc) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setFeedComments([]); // Clear previous results on a new fetch
    }

    try {
      const baseQuery = collection(firestore, 'starposts');
      let postsQuery;

      // If user has voted on figures, fetch posts from those figures.
      // Firestore 'in' queries are limited to 30 items.
      if (votedFigureIds.length > 0) {
        postsQuery = query(
          baseQuery,
          where('figureId', 'in', votedFigureIds.slice(0, 30)),
          orderBy('createdAt', 'desc'),
          ...(lastDoc ? [startAfter(lastDoc)] : []),
          limit(POST_LIMIT)
        );
      } else {
        // Otherwise (no votes or anonymous user), fetch the global feed.
        postsQuery = query(
          baseQuery,
          orderBy('createdAt', 'desc'),
          ...(lastDoc ? [startAfter(lastDoc)] : []),
          limit(POST_LIMIT)
        );
      }

      const documentSnapshots = await getDocs(postsQuery);
      
      const newPosts = documentSnapshots.docs.map(doc => {
          const data = doc.data();
          return {
              ...data,
              id: doc.id,
              // Ensure createdAt is a Date object for client-side logic
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
              updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
          } as unknown as Comment;
      });
      
      setHasMore(newPosts.length === POST_LIMIT);
      const newLastVisible = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisible(newLastVisible);

      if (lastDoc) {
        setFeedComments(prevPosts => [...prevPosts, ...newPosts]);
      } else {
        setFeedComments(newPosts);
      }

    } catch (error) {
       console.error("Error fetching starposts:", error);
    } finally {
       setIsLoading(false);
       setIsLoadingMore(false);
    }
  }, [firestore, votedFigureIds]);


  // Effect to fetch initial posts once votedFigureIds is determined or changes.
  React.useEffect(() => {
    // We wait until the votedFigureIds are known (even if it's an empty array)
    if (votedFigureIds !== null) {
      fetchPosts();
    }
  }, [votedFigureIds, fetchPosts]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && lastVisible) {
      fetchPosts(lastVisible);
    }
  };
  
  const renderContent = () => {
    // Show loading skeleton only on the very first load
    if (isLoading && feedComments.length === 0) {
      return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ));
    }

    if (feedComments.length > 0) {
      return feedComments.map(post => <StarPostCard key={post.id} post={post} />);
    }

    // Show this message only after loading is complete and there are still no comments
    if (!isLoading && feedComments.length === 0) {
        return (
          <div className="text-center py-10 text-muted-foreground">
            <p>Aún no hay actividad para mostrar.</p>
            <p className="text-sm">¡Vota por tus figuras favoritas para personalizar tu feed!</p>
          </div>
        );
    }

    return null; // Don't render anything while loading more or in other intermediate states
  };


  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <FeaturedFigures />
      <h2 className="text-xl font-bold tracking-tight font-headline mb-4">Mira lo que dicen en vivo sobre tus personajes favoritos</h2>
      
      <div className="space-y-4">
        {renderContent()}
      </div>

       {hasMore && !isLoading && (
        <div className="mt-6 text-center">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
              </>
            ) : (
              'Cargar más'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
