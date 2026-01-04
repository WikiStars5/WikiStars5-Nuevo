'use client';

import type { Comment, FeaturedFigure } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

function HomePageContent() {
  const firestore = useFirestore();

  const featuredQuery = useMemoFirebase(() => 
    firestore 
      ? query(collection(firestore, 'featured_figures'), orderBy('order')) 
      : null
  , [firestore]);
  const { data: featuredFigures, isLoading: isLoadingFeatured } = useCollection<FeaturedFigure>(featuredQuery);

  const starpostsQuery = useMemoFirebase(() => 
    firestore 
      ? query(collection(firestore, 'starposts'), orderBy('createdAt', 'desc'), limit(15))
      : null
  , [firestore]);
  const { data: feedComments, isLoading: isLoadingFeed } = useCollection<Comment>(starpostsQuery);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <FeaturedFigures initialFeaturedFigures={featuredFigures || []} />
      <h2 className="text-xl font-bold tracking-tight font-headline mb-4">Mira lo que dicen en vivo sobre tus personajes favoritos</h2>
      
      <div className="space-y-4">
        {isLoadingFeed ? (
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
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
