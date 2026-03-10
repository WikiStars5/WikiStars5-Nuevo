
'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, collectionGroup, orderBy } from 'firebase/firestore';
import type { Comment } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function FollowingFeedPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [feedPosts, setFeedPosts] = React.useState<Comment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // 1. Obtener a quién sigue el usuario
  const followingQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'following');
  }, [user, firestore]);

  const { data: following, isLoading: isLoadingFollowing } = useCollection(followingQuery, { enabled: !!user });

  React.useEffect(() => {
    const fetchFollowingPosts = async () => {
      if (!firestore || !user || isLoadingFollowing) return;

      if (!following || following.length === 0) {
        setFeedPosts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Obtenemos los IDs de los usuarios seguidos
        const followedUserIds = following.map(f => f.userId);
        
        // Firestore limita el operador 'in' a 30 elementos. Tomamos los 30 más recientes o activos.
        const targetIds = followedUserIds.slice(0, 30);

        // Usamos collectionGroup para buscar comentarios de estos usuarios en cualquier figura
        const commentsRef = collectionGroup(firestore, 'comments');
        const q = query(
          commentsRef, 
          where('userId', 'in', targetIds),
          orderBy('createdAt', 'desc'),
          limit(20)
        );

        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Comment));

        // Mezclamos un poco para que no sea siempre lo mismo en el mismo orden
        setFeedPosts(shuffleArray(posts));
      } catch (error) {
        console.error("Error fetching following feed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowingPosts();
  }, [firestore, user, following, isLoadingFollowing]);

  if (isUserLoading || isLoadingFollowing || (isLoading && feedPosts.length === 0)) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2">
            <Users className="text-primary" /> Siguiendo
        </h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3 animate-pulse">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <Users className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Inicia sesión para seguir a otros</h2>
        <p className="text-muted-foreground mb-6">Podrás ver qué opinan tus amigos y otros usuarios sobre sus figuras favoritas.</p>
        <Button asChild>
          <Link href="/login">Ir a Iniciar Sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2">
        <Users className="text-primary" /> Siguiendo
      </h1>

      {feedPosts.length > 0 ? (
        <div className="space-y-6">
          {feedPosts.map((post) => (
            <StarPostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 dark:bg-card/50 rounded-2xl border-2 border-dashed">
          <UserPlus className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Tu feed de amigos está vacío</p>
          <p className="text-sm text-muted-foreground mb-6">Sigue a otros usuarios para ver sus StarPosts aquí.</p>
          <Button asChild variant="outline">
            <Link href="/figures">Explorar Personajes</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
