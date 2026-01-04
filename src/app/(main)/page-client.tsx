
'use client';

import * as React from 'react';
import type { Comment, FeaturedFigure, AttitudeVote } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import { useFirestore, useUser } from '@/firebase';
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
  const [votedFigureIds, setVotedFigureIds] = React.useState<string[] | null>(null);

  // Effect to determine the user's voted figures
  React.useEffect(() => {
    if (user && firestore) {
      const getVotedFigures = async () => {
        const attitudeVotesRef = collection(firestore, 'users', user.uid, 'attitudeVotes');
        const attitudeSnapshot = await getDocs(attitudeVotesRef);
        const figureIds = attitudeSnapshot.docs.map(doc => doc.id);
        setVotedFigureIds(figureIds);
      };
      getVotedFigures();
    } else {
      // If there's no user, we can proceed to fetch the global feed
      setVotedFigureIds([]);
    }
  }, [user, firestore]);
  
  const fetchPosts = React.useCallback(async (lastDoc: QueryDocumentSnapshot | null = null) => {
    if (!firestore || votedFigureIds === null) return;

    if (lastDoc) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      let postsQuery;
      const baseQuery = collection(firestore, 'starposts');

      // If user has voted on figures, fetch posts from those figures.
      if (votedFigureIds.length > 0) {
        postsQuery = query(
          baseQuery,
          where('figureId', 'in', votedFigureIds),
          orderBy('createdAt', 'desc'),
          ...(lastDoc ? [startAfter(lastDoc)] : []),
          limit(POST_LIMIT)
        );
      } else {
        // Otherwise, fetch the global feed.
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
              createdAt: data.createdAt.toDate(), // Keep as Date object for sorting
              updatedAt: data.updatedAt?.toDate() || null,
          } as unknown as Comment;
      });

      setHasMore(newPosts.length === POST_LIMIT);
      
      const newLastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1] || null;
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


  // Effect to fetch initial posts once votedFigureIds is determined
  React.useEffect(() => {
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
    if (isLoading) {
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

    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>Aún no hay actividad para mostrar.</p>
        <p className="text-sm">¡Vota por tus figuras favoritas para personalizar tu feed!</p>
      </div>
    );
  };


  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <FeaturedFigures initialFeaturedFigures={initialFeaturedFigures} />
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
