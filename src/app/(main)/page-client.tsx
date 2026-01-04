'use client';

import * as React from 'react';
import type { Comment, FeaturedFigure } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const INITIAL_LOAD_LIMIT = 10;

interface HomePageContentProps {
  initialFeaturedFigures: FeaturedFigure[];
  initialPosts: Comment[];
  initialLastVisible: any | null; // Serialized DocumentSnapshot data
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
  // The 'last visible' state now only needs to store the cursor value (the timestamp).
  const [lastVisible, setLastVisible] = React.useState<string | null>(initialLastVisible?._data.createdAt || null);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(initialHasMore);

  const fetchMorePosts = async () => {
    if (!firestore || !lastVisible) return;
    setIsLoadingMore(true);

    try {
        // Convert the ISO string timestamp back to a Firestore Timestamp for the query
        const lastVisibleTimestamp = Timestamp.fromDate(new Date(lastVisible));
      
        const nextBatch = query(
            collection(firestore, 'starposts'),
            orderBy('createdAt', 'desc'),
            startAfter(lastVisibleTimestamp),
            limit(INITIAL_LOAD_LIMIT)
        );

        const documentSnapshots = await getDocs(nextBatch);
        
        // Deserialize the documents from the snapshot
        const newPosts = documentSnapshots.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt.toDate().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString() || null,
            } as unknown as Comment;
        });

        setFeedComments(prevPosts => [...prevPosts, ...newPosts]);

        const lastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        if (lastVisibleDoc) {
           setLastVisible((lastVisibleDoc.data().createdAt as Timestamp).toDate().toISOString());
        }
        
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
      <FeaturedFigures />
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
