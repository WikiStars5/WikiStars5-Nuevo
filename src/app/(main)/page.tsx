'use client';

import * as React from 'react';
import type { Comment } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import FeaturedFigures from '@/components/shared/featured-figures';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [feedComments, setFeedComments] = React.useState<Comment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchFeed = async () => {
      if (!firestore) return;
      setIsLoading(true);
      
      let finalComments: Comment[] = [];
      let personalizedFeedIsEmpty = true;

      // 1. Try to fetch a personalized feed
      if (user) {
        try {
          const attitudeVotesQuery = query(collection(firestore, `users/${user.uid}/attitudeVotes`));
          const attitudeVotesSnapshot = await getDocs(attitudeVotesQuery);
          
          if (!attitudeVotesSnapshot.empty) {
            const votedFigureIds = attitudeVotesSnapshot.docs.map(doc => doc.data().figureId);
            
            // Fetch the latest comment from each voted figure's profile
            const commentPromises = votedFigureIds.map(figureId => {
              const commentsQuery = query(
                collection(firestore, 'figures', figureId, 'comments'),
                orderBy('createdAt', 'desc'),
                limit(1) 
              );
              return getDocs(commentsQuery);
            });

            const commentSnapshots = await Promise.all(commentPromises);
            
            commentSnapshots.forEach(snapshot => {
              if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                finalComments.push({ id: doc.id, ...doc.data() } as Comment);
              }
            });
            
            if (finalComments.length > 0) {
              personalizedFeedIsEmpty = false;
            }
          }
        } catch (error) {
          console.error("Error fetching personalized feed:", error);
          // If personalized feed fails, we'll proceed to the generic feed.
        }
      }
      
      // 2. If personalized feed is empty, fetch the generic feed from `/starposts`
      if (personalizedFeedIsEmpty) {
        try {
            const genericQuery = query(
              collection(firestore, 'starposts'),
              orderBy('createdAt', 'desc'),
              limit(10)
            );
            const genericSnapshot = await getDocs(genericQuery);
            if (!genericSnapshot.empty) {
              genericSnapshot.forEach(doc => {
                 finalComments.push({ id: doc.id, ...doc.data() } as Comment);
              });
            }
        } catch (error) {
            console.error("Error fetching generic starposts feed:", error);
        }
      }
      
      // Sort all collected comments by date and take the top 15
      finalComments.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;
      });
      setFeedComments(finalComments.slice(0, 15));
      setIsLoading(false);
    };

    fetchFeed();
  }, [firestore, user]);


  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <FeaturedFigures />
      <h2 className="text-xl font-bold tracking-tight font-headline mb-4">Mira lo que dicen en vivo sobre tus personajes favoritos</h2>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {feedComments.length > 0 ? (
            feedComments.map(post => (
                <StarPostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>Aún no hay actividad para mostrar.</p>
              <p className="text-sm">¡Vota por tus figuras favoritas para personalizar tu feed!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
