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
const LOAD_MORE_LIMIT = 10;

function HomePageContent() {
  const firestore = useFirestore();

  const [feedComments, setFeedComments] = React.useState<Comment[]>([]);
  const [lastVisible, setLastVisible] = React.useState<DocumentSnapshot | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);


  const featuredQuery = useMemoFirebase(() => 
    firestore 
      ? query(collection(firestore, 'featured_figures'), orderBy('order')) 
      : null
  , [firestore]);
  const { data: featuredFigures, isLoading: isLoadingFeatured } = useCollection<FeaturedFigure>(featuredQuery);
  
  React.useEffect(() => {
    const fetchInitialPosts = async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const firstBatch = query(
                collection(firestore, 'starposts'), 
                orderBy('createdAt', 'desc'), 
                limit(INITIAL_LOAD_LIMIT)
            );
            const documentSnapshots = await getDocs(firstBatch);
            
            const posts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
            setFeedComments(posts);

            if (documentSnapshots.docs.length > 0) {
              const lastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
              setLastVisible(lastVisibleDoc);
            }

            if (documentSnapshots.docs.length < INITIAL_LOAD_LIMIT) {
                setHasMore(false);
            }

        } catch (error) {
            console.error("Error fetching initial starposts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchInitialPosts();
  }, [firestore]);


  const fetchMorePosts = async () => {
    if (!firestore || !lastVisible) return;
    setIsLoadingMore(true);

    try {
        const nextBatch = query(
            collection(firestore, 'starposts'),
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(LOAD_MORE_LIMIT)
        );

        const documentSnapshots = await getDocs(nextBatch);
        const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));

        setFeedComments(prevPosts => [...prevPosts, ...newPosts]);

        if (documentSnapshots.docs.length > 0) {
            const lastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
            setLastVisible(lastVisibleDoc);
        }
        
        if (documentSnapshots.docs.length < LOAD_MORE_LIMIT) {
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
      <FeaturedFigures initialFeaturedFigures={featuredFigures || []} />
      <h2 className="text-xl font-bold tracking-tight font-headline mb-4">Mira lo que dicen en vivo sobre tus personajes favoritos</h2>
      
      <div className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        ) : feedComments && feedComments.length > 0 ? (
          feedComments.map(post => <StarPostCard key={post.id} post={post} />)
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>Aún no hay actividad para mostrar.</p>
            <p className="text-sm">¡Vota por tus figuras favoritas para personalizar tu feed!</p>
          </div>
        )}
      </div>

       {hasMore && !isLoading && (
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

export default function HomePage() {
  return <HomePageContent />;
}
