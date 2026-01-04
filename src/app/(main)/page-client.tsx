
'use client';

import * as React from 'react';
import type { Comment, FeaturedFigure } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const INITIAL_LOAD_LIMIT = 10;

interface HomePageContentProps {
  initialFeaturedFigures: FeaturedFigure[];
  initialPosts: Comment[];
  initialLastVisible: any | null; // Serialized DocumentSnapshot
  initialHasMore: boolean;
}

export default function HomePageContent({ 
  initialFeaturedFigures, 
  initialPosts,
  initialLastVisible,
  initialHasMore
}: HomePageContentProps) {
  const firestore = useFirestore();

  const [feedComments, setFeedComments] = React.useState<Comment[]>(initialPosts);
  const [lastVisible, setLastVisible] = React.useState<DocumentSnapshot | null>(initialLastVisible);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(initialHasMore);

  const fetchMorePosts = async () => {
    if (!firestore || !lastVisible) return;
    setIsLoadingMore(true);

    try {
        const nextBatch = query(
            collection(firestore, 'starposts'),
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(INITIAL_LOAD_LIMIT)
        );

        const documentSnapshots = await getDocs(nextBatch);
        const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));

        setFeedComments(prevPosts => [...prevPosts, ...newPosts]);

        const lastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        setLastVisible(lastVisibleDoc);
        
        if (documentSnapshots.docs.length < INITIAL_LOAD_LIMIT) {
            setHasMore(false);
        }
    } catch (error) {
         console.error("Error fetching more starposts:", error);
    } finally {
        setIsLoadingMore(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <FeaturedFigures initialFeaturedFigures={initialFeaturedFigures} />
      <h2 className="text-xl font-bold tracking-tight font-headline mb-4">Mira lo que dicen en vivo sobre tus personajes favoritos</h2>
      
      <div className="space-y-4">
        {feedComments.length > 0 ? (
          feedComments.map(post => <StarPostCard key={post.id} post={post} />)
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>Aún no hay actividad para mostrar.</p>
            <p className="text-sm">¡Vota por tus figuras favoritas para personalizar tu feed!</p>
          </div>
        )}
      </div>

       {hasMore && (
        <div className="mt-6 text-center">
          <Button
            onClick={fetchMorePosts}
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
