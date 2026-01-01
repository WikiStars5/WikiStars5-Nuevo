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

      try {
        let finalComments: Comment[] = [];

        if (user) {
          // 1. Get the figure IDs the user has voted on
          const votesQuery = query(collection(firestore, `users/${user.uid}/attitudeVotes`));
          const votesSnapshot = await getDocs(votesQuery);
          const votedFigureIds = votesSnapshot.docs.map(doc => doc.data().figureId);

          if (votedFigureIds.length > 0) {
            // 2. Fetch the latest comment for each voted figure
            const commentPromises = votedFigureIds.map(figureId => {
              const commentsQuery = query(
                collection(firestore, 'figures', figureId, 'comments'),
                where('parentId', '==', null),
                orderBy('createdAt', 'desc'),
                limit(5) // Fetch a few from each to get variety
              );
              return getDocs(commentsQuery);
            });

            const commentSnapshots = await Promise.all(commentPromises);
            
            commentSnapshots.forEach(snapshot => {
              snapshot.forEach(doc => {
                finalComments.push({ id: doc.id, ...doc.data() } as Comment);
              });
            });
          }
        }
        
        // 3. Fallback to generic feed if personalized one is empty
        if (finalComments.length === 0) {
            const genericQuery = query(
              collection(firestore, 'starposts'), // Querying the dedicated feed collection
              orderBy('createdAt', 'desc'),
              limit(10)
            );
            const genericSnapshot = await getDocs(genericQuery);
            genericSnapshot.forEach(doc => {
                 finalComments.push({ id: doc.id, ...doc.data() } as Comment);
            });
        }
        
        // 4. Sort all collected comments by date and take the top 15
        finalComments.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setFeedComments(finalComments.slice(0, 15));

      } catch (error) {
        console.error("Error fetching feed comments:", error);
        setFeedComments([]);
      } finally {
        setIsLoading(false);
      }
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
          {feedComments.map(post => (
              <StarPostCard key={post.id} post={post} />
          ))}
          {feedComments.length === 0 && (
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
