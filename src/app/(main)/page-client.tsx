
'use client';

import * as React from 'react';
import type { Comment, AttitudeVote } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const POST_LIMIT = 10;
const POSTS_PER_FIGURE = 5; // How many recent posts to get from each figure

interface HomePageContentProps {
  initialFeaturedFigures: FeaturedFigure[];
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
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

  const votedFigureIds = React.useMemo(() => {
    if (!attitudeVotes) return null;
    return attitudeVotes.map(vote => vote.id); // The figureId is the doc id
  }, [attitudeVotes]);
  
  const fetchPosts = React.useCallback(async (lastDoc: QueryDocumentSnapshot | null = null) => {
    if (!firestore || votedFigureIds === null) return;

    if (lastDoc) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setFeedComments([]);
    }

    try {
        let posts: Comment[] = [];
        let newLastVisible: QueryDocumentSnapshot | null = null;
        let newHasMore = false;

        // If user has voted on figures, fetch posts from those figures.
        if (votedFigureIds.length > 0) {
            const postPromises = votedFigureIds.map(figureId => {
                const figurePostsQuery = query(
                    collection(firestore, 'starposts'),
                    where('figureId', '==', figureId),
                    orderBy('createdAt', 'desc'),
                    limit(POSTS_PER_FIGURE)
                );
                return getDocs(figurePostsQuery);
            });

            const snapshots = await Promise.all(postPromises);
            const allPosts = snapshots.flatMap(snapshot => 
                snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment))
            );
            
            posts = shuffleArray(allPosts);
            newHasMore = false; // "Load More" is disabled for personalized feed for simplicity

        } else {
            // Otherwise (no votes or anonymous user), fetch the global feed.
            const globalQuery = query(
              collection(firestore, 'starposts'),
              orderBy('createdAt', 'desc'),
              ...(lastDoc ? [startAfter(lastDoc)] : []),
              limit(POST_LIMIT)
            );
            const documentSnapshots = await getDocs(globalQuery);
            
            posts = documentSnapshots.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
                } as unknown as Comment;
            });
            
            newHasMore = posts.length === POST_LIMIT;
            newLastVisible = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
        }

        setHasMore(newHasMore);
        setLastVisible(newLastVisible);

        if (lastDoc) {
            setFeedComments(prevPosts => [...prevPosts, ...posts]);
        } else {
            setFeedComments(posts);
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
    if (isLoadingVotes) return; // Wait until we know what the user has voted for.
    fetchPosts();
  }, [votedFigureIds, fetchPosts, isLoadingVotes]);


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
