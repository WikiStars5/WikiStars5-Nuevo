
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, startAfter, limit, getDocs, doc, getDoc, DocumentSnapshot } from 'firebase/firestore';
import type { Comment, FeaturedFigure } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface HomePageContentProps {
  initialFeaturedFigures: FeaturedFigure[];
  initialPosts: Comment[];
}

export default function HomePageContent({ initialFeaturedFigures, initialPosts }: HomePageContentProps) {
  const firestore = useFirestore();
  const [feedComments, setFeedComments] = useState<Comment[]>(initialPosts);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === 10);
  
   useEffect(() => {
    // This effect establishes the initial "last visible" document for pagination
    const setupPagination = async () => {
      if (initialPosts.length > 0 && firestore) {
        // We need to get a DocumentSnapshot, not just the ID.
        // We can re-fetch just the last document to get its snapshot for the 'startAfter' cursor.
        const lastPostId = initialPosts[initialPosts.length - 1].id;
        try {
          const lastDocRef = doc(firestore, 'starposts', lastPostId);
          const docSnap = await getDoc(lastDocRef);
          if (docSnap.exists()) {
            setLastVisible(docSnap);
          }
        } catch (error) {
          console.error("Error setting up pagination cursor:", error);
        }
      }
    };
    setupPagination();
  }, [initialPosts, firestore]);


  const fetchMorePosts = async () => {
    if (!firestore || !lastVisible) return;
    setIsLoadingMore(true);

    try {
        const nextBatch = query(
            collection(firestore, 'starposts'),
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(10)
        );

        const documentSnapshots = await getDocs(nextBatch);
        const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));

        setFeedComments(prevPosts => [...prevPosts, ...newPosts]);

        const lastVisibleDoc = documentSnapshots.docs.length > 0 
            ? documentSnapshots.docs[documentSnapshots.docs.length - 1]
            : null;

        if (lastVisibleDoc) {
            setLastVisible(lastVisibleDoc);
        }
        
        if (documentSnapshots.docs.length < 10) {
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
