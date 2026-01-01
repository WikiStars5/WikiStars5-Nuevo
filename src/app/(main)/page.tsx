'use client';

import * as React from 'react';
import type { Comment, AttitudeVote } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { collection, query, where, orderBy, limit, getDocs, collectionGroup } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
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
      let finalQuery;

      try {
        if (user) {
          // 1. Fetch the user's attitude votes to find figures they care about.
          const votesQuery = query(collection(firestore, `users/${user.uid}/attitudeVotes`));
          const votesSnapshot = await getDocs(votesQuery);
          const votedFigureIds = votesSnapshot.docs.map(doc => doc.data().figureId);

          if (votedFigureIds.length > 0) {
            // 2. Build a personalized query for comments from those figures.
            // Firestore 'in' queries are limited to 30 items.
            const idsForQuery = votedFigureIds.slice(0, 30);
            finalQuery = query(
              collectionGroup(firestore, 'comments'),
              where('figureId', 'in', idsForQuery),
              where('parentId', '==', null), // Ensure we only get root comments
              orderBy('createdAt', 'desc'),
              limit(10)
            );
          }
        }

        // 3. If no user or no votes, create a generic fallback query.
        if (!finalQuery) {
          finalQuery = query(
            collectionGroup(firestore, 'comments'),
            where('parentId', '==', null),
            orderBy('createdAt', 'desc'),
            limit(10)
          );
        }

        const commentsSnapshot = await getDocs(finalQuery);
        const comments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Comment);
        setFeedComments(comments);
      } catch (error) {
        console.error("Error fetching feed comments:", error);
        // In case of error, you might want to show an error message
        // For now, we'll just show an empty feed.
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
