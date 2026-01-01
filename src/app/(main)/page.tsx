
'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import type { Comment } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const firestore = useFirestore();

  const starPostsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collectionGroup(firestore, 'comments'), 
        orderBy('createdAt', 'desc'), 
        limit(50)
    );
  }, [firestore]);

  const { data: starPosts, isLoading } = useCollection<Comment>(starPostsQuery);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">
          Actividad Reciente
        </h1>
        <p className="text-muted-foreground mt-2">
          Mira las últimas opiniones de la comunidad.
        </p>
      </header>

      <div className="space-y-4">
        {isLoading && (
            Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))
        )}

        {!isLoading && starPosts?.map(post => (
            <StarPostCard key={post.id} post={post} />
        ))}

        {!isLoading && (!starPosts || starPosts.length === 0) && (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Aún no hay actividad. ¡Sé el primero en dejar una opinión!</p>
            </div>
        )}
      </div>
    </div>
  );
}
