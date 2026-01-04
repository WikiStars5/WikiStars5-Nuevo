'use client';

import type { Comment } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import FeaturedFigures from '@/components/shared/featured-figures';
import { Skeleton } from '@/components/ui/skeleton';

function StarpostFeed() {
  const firestore = useFirestore();

  const starpostsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'starposts'),
      orderBy('createdAt', 'desc'),
      limit(15)
    );
  }, [firestore]);

  const { data: feedComments, isLoading } = useCollection<Comment>(starpostsQuery);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedComments && feedComments.length > 0 ? (
        feedComments.map(post => <StarPostCard key={post.id} post={post} />)
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          <p>Aún no hay actividad para mostrar.</p>
          <p className="text-sm">¡Vota por tus figuras favoritas para personalizar tu feed!</p>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <FeaturedFigures />
      <h2 className="text-xl font-bold tracking-tight font-headline mb-4">Mira lo que dicen en vivo sobre tus personajes favoritos</h2>
      <StarpostFeed />
    </div>
  );
}
